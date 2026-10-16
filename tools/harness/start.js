// Lap-1 chaos meter: lane spread after the start, position changes, contacts, run-offs, incidents
const fs=require("fs"),vm=require("vm");
const [path,track,seeds]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
for(let sd=1;sd<=+seeds;sd++){
 const M=Object.create(Math);M.random=mulberry32(sd*7+3);
 const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
 vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,HALF_TRACK,RACE_HALF});',ctx);
 vm.runInContext(`var __L=[];logMsg=t=>__L.push(t);showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
 const g=ctx.__g; const grid={}; g().cars.forEach(c=>grid[c.code]=c.pos);
 let laneSnap=null, offT=0, lanes300=null; const maxLat={};
 for(let i=0;i<60*400;i++){ctx.stepPhysics(1/60);const st=g().state;
  const run=g().cars.filter(c=>!c.dnf);
  if(!lanes300 && st.raceControl==="GREEN" && Math.max(...run.map(c=>c.totalDistM))>300){ const lats=run.map(c=>c.dLat); const mean=lats.reduce((a,b)=>a+b,0)/lats.length; lanes300=Math.sqrt(lats.reduce((a,b)=>a+(b-mean)**2,0)/lats.length).toFixed(2); }
  for(const c of run){ if(Math.abs(c.dLat)>g().HALF_TRACK) offT+=1/60; maxLat[c.code]=Math.max(maxLat[c.code]||0,Math.abs(c.dLat)-g().RACE_HALF);} 
  if(st.leaderLap>=2 && !laneSnap){ laneSnap=true; break; }
 }
 const st=g().state, run=g().cars;
 const moves=run.filter(c=>!c.dnf).map(c=>grid[c.code]-c.pos);
 const L=vm.runInContext("__L",ctx);
 const cnt=r=>L.filter(t=>r.test(t)).length;
 const big=run.filter(c=>!c.dnf).map(c=>({c:c.code,d:grid[c.code]-c.pos})).sort((a,b)=>b.d-a.d);
 console.log(`seed ${sd}: latStd@300m ${lanes300} | sum|Δpos| ${moves.reduce((a,b)=>a+Math.abs(b),0)} best ${big[0].c}+${big[0].d} worst ${big[big.length-1].c}${big[big.length-1].d} | contacts ${cnt(/contact/i)} wing ${cnt(/wing damaged/)} punct ${cnt(/puncture/)} | wide ${st.stats.wide} avoid ${st.stats.avoid} offtrack-s ${offT.toFixed(1)} | DNF ${run.filter(c=>c.dnf).map(c=>c.code).join(",")||"-"} SC/VSC ${cnt(/Safety Car exits|VSC deployed/)} | runoff-users ${Object.entries(maxLat).filter(([k,v])=>v>0.8).map(([k,v])=>k+'('+v.toFixed(1)+')').join(',')||'-'} | incidents: ${L.filter(t=>/DNF|crash|barrier|beached|wing damaged|puncture/.test(t)).map(t=>t.slice(0,70)).join(' ; ')} | launch: ${L.filter(t=>/launch|bogs|wheelspin/.test(t)&&!/LIGHTS/.test(t)).map(t=>t.replace(/^L1: /,"")).join("; ")}`);
}
