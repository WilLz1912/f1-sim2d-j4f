const fs=require("fs"),vm=require("vm");
const [path,track,seed,laps]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mk(seedv){const M_=Object.create(Math);M_.random=mulberry32(seedv);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,spline,CIRCUITS,carLineLat});',ctx);return ctx;}
// 1. solo reference profile (per spline index, min over laps 3-4)
let ctx=mk(5);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace(); cars=[cars.find(c=>c.code==="HUL")]; cars[0].failAtM=1e15; cars[0].failMode=null;`,ctx);
let G=ctx.__g(); const M=G.spline.length; const ref=new Float64Array(M).fill(0); let seen=0,last=null;
for(let i=0;i<60*400;i++){ctx.stepPhysics(1/60);G=ctx.__g();const c=G.cars[0]; if(G.state.raceControl!=="GREEN")continue;
 if(c.lap!==last){last=c.lap;seen++; if(seen>4)break;} if(seen>=3){const k=Math.floor(c.s*M)%M; ref[k]=Math.max(ref[k],c.speedMps*3.6);} }
for(let k=0;k<M;k++) if(!ref[k]) ref[k]=ref[(k+M-1)%M];
const cfg=G.CIRCUITS[track]; const apex=cfg.corners.map(c=>({num:c.num,k:c.kIdx}));
// 2. race
ctx=mk(+seed);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const hist={}, ev=[]; const lastEv={};
for(let i=0;i<60*8000;i++){ctx.stepPhysics(1/60);G=ctx.__g(); if(G.state.raceOver||G.state.leaderLap>+laps)break;
 const green=G.state.raceControl==="GREEN";
 for(const c of G.cars){ if(c.dnf||c.inPit) continue; const k=Math.floor(c.s*M)%M;
  const h=hist[c.idx]||(hist[c.idx]=[]);
  if(i%6===0){h.push({s:c.s,v:c.speedMps*3.6,ref:ref[k],off:(c.dLat-G.carLineLat(c,c.s)),tow:c.towFactor||0,dirty:c.dirtyAir||0,mode:c.aeroMode,atk:c.attacking,def:c.defending,lb:c.lateBrake>0,err:c.mistakeT>0,tt:c.tyreTemp,w:c.wear,br:c.brake,mu:c.muEff}); if(h.length>30)h.shift();}
  if(!green) continue;
  for(const a of apex){ const dk=Math.min(Math.abs(k-a.k),M-Math.abs(k-a.k)); if(dk*cfg.lengthMeters/M>12) continue;
   const over=c.speedMps*3.6-ref[k];
   const key=c.idx+"_"+a.num; if(over>10 && (!lastEv[key]||G.state.raceTime-lastEv[key]>30)){lastEv[key]=G.state.raceTime;
     ev.push({t:G.state.raceTime,code:c.code,corner:a.num,over:over.toFixed(0),h:h.slice(-12)});}
  } } }
const cnt={};for(const e of ev){cnt[e.corner]=(cnt[e.corner]||0)+1;}
console.log("overspeed>10kmh events by corner",JSON.stringify(cnt),"total",ev.length);
for(const e of ev.slice(0,40)){console.log(`\n${e.code} T${e.corner} +${e.over} t=${e.t.toFixed(0)}`);
 console.log(e.h.map(x=>`s${x.s.toFixed(3)} v${x.v.toFixed(0)}/${x.ref.toFixed(0)} off${x.off.toFixed(1)} tow${x.tow.toFixed(2)} dirty${x.dirty.toFixed(2)} ${x.mode}${x.atk?" ATK":""}${x.def?" DEF":""}${x.lb?" LB":""}${x.err?" ERR":""} tt${x.tt.toFixed(0)} w${x.w.toFixed(2)} b${x.br.toFixed(1)} mu${x.mu.toFixed(2)}`).join("\n"));}
