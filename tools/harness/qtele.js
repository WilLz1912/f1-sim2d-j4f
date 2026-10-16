const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
function mk(){const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI,fmtLap,TYRE_SPECS});',ctx);return ctx;}
// (1) qualifying: telemetry of RUS's flying laps
let ctx=mk(); vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";startWeekend();`,ctx);
let g=ctx.__g; let lap=null, out=[];
for(let i=0;i<60*1300;i++){ctx.stepPhysics(1/60);const G=g();const c=G.cars.find(x=>x.code==="RUS");
 if(c.qMode==="PUSH"&&!c.inPit){ if(!lap||lap.t0!==c.qLapStart){ if(lap)out.push(lap); lap={t0:c.qLapStart,ers0:c.ers,temp0:c.tyreTemp,fuel:c.fuelKg,comp:c.compound,wear0:c.wear,minErs:1,clipT:0,vmax:0,mu:[],grip:G.state.trackGripEvol,setup:c.setupQ}; }
   lap.minErs=Math.min(lap.minErs,c.ers); if(c.aeroMode==="CLIP"||c.aeroMode==="S-CLIP")lap.clipT+=1/60; lap.vmax=Math.max(lap.vmax,c.speedMps*3.6); lap.mu.push(c.muEff); lap.end=G.state.raceTime; }
 if(G.state.session!=="Q1")break;}
if(lap)out.push(lap);
for(const l of out) console.log(`QUALI push: ${(l.end-l.t0).toFixed(2)}s(approx) comp ${l.comp} ers0 ${l.ers0.toFixed(2)} minErs ${l.minErs.toFixed(2)} clip ${l.clipT.toFixed(1)}s vmax ${l.vmax.toFixed(0)} tyreT0 ${l.temp0.toFixed(0)} fuel ${l.fuel.toFixed(1)} grip ${l.grip.toFixed(3)} setup ${l.setup.toFixed(3)} muAvg ${(l.mu.reduce((a,b)=>a+b,0)/l.mu.length).toFixed(3)}`);
console.log("Q1 best:",Object.entries(g().QUALI.res).map(([k,v])=>[k,v.Q1]).filter(x=>x[1]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(x=>x[0]+" "+g().fmtLap(x[1])).join(", "));
// (2) race: fastest lap and the telemetry of RUS's best lap
ctx=mk(); vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace();`,ctx); g=ctx.__g;
let rl=null, best=null;
for(let i=0;i<60*6500;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.raceOver)break; const c=G.cars.find(x=>x.code==="RUS"); if(!c||c.dnf)continue;
 if(!rl||rl.lap!==c.lap){ if(rl&&rl.lap>2&&rl.clean){const t=G.state.raceTime-rl.t0; if(!best||t<best.t)best={...rl,t};} rl={lap:c.lap,t0:G.state.raceTime,ers0:c.ers,minErs:1,clipT:0,vmax:0,mu:[],fuel:c.fuelKg,comp:c.compound,wear:c.wear,temp0:c.tyreTemp,clean:true,grip:G.state.trackGripEvol}; }
 if(c.inPit||G.state.raceControl!=="GREEN")rl.clean=false; rl.minErs=Math.min(rl.minErs,c.ers); if(c.aeroMode==="CLIP"||c.aeroMode==="S-CLIP")rl.clipT+=1/60; rl.vmax=Math.max(rl.vmax,c.speedMps*3.6); rl.mu.push(c.muEff);}
console.log(`RACE FL: ${g().state.fastestLap&&g().fmtLap(g().state.fastestLap.time)} (${g().state.fastestLap&&g().state.fastestLap.code})`);
if(best) console.log(`RUS best race lap: ${best.t.toFixed(2)} lap ${best.lap} comp ${best.comp} wear ${best.wear.toFixed(2)} ers0 ${best.ers0.toFixed(2)} minErs ${best.minErs.toFixed(2)} clip ${best.clipT.toFixed(1)}s vmax ${best.vmax.toFixed(0)} tyreT0 ${best.temp0.toFixed(0)} fuel ${best.fuel.toFixed(1)} grip ${best.grip.toFixed(3)} muAvg ${(best.mu.reduce((a,b)=>a+b,0)/best.mu.length).toFixed(3)}`);
