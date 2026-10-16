const fs=require("fs"),vm=require("vm");
const [path,track,seed]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,spline,HALF_TRACK,RACE_HALF,carLineLat,zoneAt,ZONE});',ctx);
const EV=[];
vm.runInContext(`showToast=()=>{};activeTrackKey="${track}";initRace();logMsg=t=>{if(/DNF|VSC deployed|Safety Car exits|beached|barrier|spins|mistake|locks/i.test(t))__EV(t)};`,ctx.__EVctx=ctx);
const g=ctx.__g; const hist={}; const NM=["STD","V","LATE","U"];
ctx.__EV=t=>{const G=g();const m=t.match(/([A-Z]{3})/g)||[];const out=[`\n[t=${G.state.raceTime.toFixed(1)} L${G.state.leaderLap}] ${t}`];
 for(const code of m.slice(0,2)){const c=G.cars.find(x=>x.code===code); if(c&&hist[c.idx]) out.push(`  ${code}: `+hist[c.idx].filter((_,j)=>j%12===0).join(" | "));}
 EV.push(out.join("\n"));};
for(let i=0;i<60*6000;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.raceOver)break;
 if(i%3)continue;
 for(const c of G.cars){ if(c.dnf&&c.dnfState==="STOPPED") continue;
  const h=hist[c.idx]||(hist[c.idx]=[]);
  h.push(`s${c.s.toFixed(3)} lat${c.dLat.toFixed(1)}/ln${G.carLineLat(c,c.s).toFixed(1)} v${(c.speedMps*3.6).toFixed(0)} ${NM[c.lineNow||0]}${c.attacking?" ATK":""}${c.defending?" DEF":""}${c.escapeT>0?" ESC"+c.escapeSide:""}${c.mistakeT>0?" ERR":""}${c.lateBrake>0?" LB":""} b${c.brake.toFixed(1)} w${c.wear.toFixed(2)}`);
  if(h.length>60)h.shift(); }
}
console.log(EV.join("\n"));
