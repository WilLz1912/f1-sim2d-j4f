const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
function mk(){const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,spline,CORNERS,LINES,LINE_TYPES,carLineLat,CIRCUITS,RACE_HALF});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);return ctx;}
let ctx=mk(); let g=ctx.__g(); const M=g.spline.length, L=g.CIRCUITS[track].lengthMeters;
console.log("corners:",g.CORNERS.length,"idealLap",g.state.idealLapEstimate.toFixed(2));
console.log("corner  s     dir  kA    | dt[STD,V,LATE,U] s            | vExit km/h [STD,V,LATE,U] | vMin km/h");
g.CORNERS.forEach((c,i)=>console.log(`T${String(i+1).padEnd(2)} ${(c.iA/M).toFixed(3)} ${c.dir>0?"+":"-"}  ${c.kA.toFixed(3)} | ${c.cost.map(x=>x.dt.toFixed(2).padStart(5)).join(" ")} | ${c.cost.map(x=>(x.vExit*3.6).toFixed(0).padStart(4)).join(" ")} | ${c.cost.map(x=>(x.vMin*3.6).toFixed(0).padStart(4)).join(" ")}`));
for(let t=0;t<4;t++){
 ctx=mk(); g=ctx.__g();
 vm.runInContext(`cars=[cars.find(c=>c.code==="VER")];cars[0].idx=0;state.raceControl="GREEN";cars[0].reactionDelay=0;cars[0].lineSel=new Int8Array(CORNERS.length).fill(${t});cars[0].lineFixed=true;for(const k in TYRE_SPECS)TYRE_SPECS[k].wear=0;`,ctx);
 let last=1,t0=0,laps=[],dev=0,devS=0,gam=0,offs=0; const ct=[];
 for(let i=0;i<60*400;i++){ctx.stepPhysics(1/60);const c=ctx.__g().cars[0];
  if(c.lap===3){const d=Math.abs(c.dLat-g.carLineLat(c,c.s));if(d>dev){dev=d;devS=c.s;} gam=Math.max(gam,c.gammaTire||0); if(Math.abs(c.dLat)>g.RACE_HALF+0.3)offs++;}
  if(c.lap>last){laps.push(c.lapT0!==undefined?0:0);laps[laps.length-1]=ctx.__g().state.raceTime-t0;t0=ctx.__g().state.raceTime;last=c.lap;if(laps.length>=3)break;}
  if(c.lap===3){const k=Math.floor(c.s*M); const cn=g.CORNERS.findIndex(C=>{const a=((k-(C.iA-Math.round(80/(L/M))))%M+2*M)%M; return a< Math.round(200/(L/M));}); if(cn>=0){(ct[cn]=ct[cn]||{t:0,vx:0}).t+=1/60;}}}
 console.log('   per-corner real time (s, window apex-80m..apex+120m):', ct.map(x=>x?x.t.toFixed(2):'-').join(' '));
 console.log(`${g.LINE_TYPES[t].padEnd(4)} solo: lap2 ${laps[1].toFixed(2)} lap3 ${laps[2].toFixed(2)} | max dev from own line ${dev.toFixed(2)} (units) at s=${devS.toFixed(3)} | max gamma ${gam.toFixed(2)} | frames beyond usable width ${offs}`);
}
