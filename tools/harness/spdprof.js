const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(5);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,CIRCUITS});',ctx);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace(); cars=[cars.find(c=>c.code==="RUS")]; cars[0].failAtM=1e15; cars[0].failMode=null;`,ctx);
const g=ctx.__g; const cfg=g().CIRCUITS[track]; const L=cfg.lengthMeters;
console.log("corners:",cfg.corners.map(c=>c.num+"@"+c.s.toFixed(3)+"("+(c.s*L).toFixed(0)+"m)").join(" "));
console.log("xModeZones:",JSON.stringify(cfg.xModeZones),"speedTrapS",cfg.speedTrapS);
let lastLap=null,t0=null,prof=[],lapN=0,laps=[];
for(let i=0;i<60*600;i++){ctx.stepPhysics(1/60);const G=g(),c=G.cars[0];
 if(G.state.raceControl==="FORMATION"||G.state.raceControl==="START_LIGHTS")continue;
 if(c.lap!==lastLap){ if(t0!==null) laps.push({t:G.state.raceTime-t0,prof}); t0=G.state.raceTime; prof=[]; lastLap=c.lap; lapN++; if(lapN>4)break;}
 prof.push([c.s,c.speedMps*3.6,G.state.raceTime-t0]);}
const lp=laps[2]; console.log("lap time",lp.t.toFixed(2));
// speed every 1% of lap
const out=[]; for(let b=0;b<100;b++){const pts=lp.prof.filter(p=>Math.floor(p[0]*100)===b); if(pts.length) out.push(b+":"+Math.round(pts.reduce((s,p)=>s+p[1],0)/pts.length));}
console.log(out.join(" "));
fs.writeFileSync(`prof_${track}.json`,JSON.stringify(lp));
