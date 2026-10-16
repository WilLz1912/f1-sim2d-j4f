const fs=require("fs"),vm=require("vm");
const [path,track,seed,code_,tA,tB]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace("  // ---------------- G. Lane choice (target lateral position) ----------------","  c._w1 = desiredSpeedMps;\n  // ---------------- G. Lane choice (target lateral position) ----------------");
code=code.replace("  // ---------------- I. Power unit: ICE + MGU-K and a real energy store (2026 rules) ----------------","  c._w3 = desiredSpeedMps; c._cmdLat = cmdLat;\n  // ---------------- I. Power unit: ICE + MGU-K and a real energy store (2026 rules) ----------------");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,spline,carLineLat});',ctx);
vm.runInContext(`showToast=()=>{};activeTrackKey="${track}";initRace();logMsg=t=>{if(state.raceTime>${tA})console.log("LOG",state.raceTime.toFixed(2),t)};`,ctx);
const g=ctx.__g;
for(let i=0;;i++){ctx.stepPhysics(1/60);const G=g();if(G.state.raceTime>+tB)break;if(G.state.raceTime<+tA)continue; if(i%2)continue;
 const c=G.cars.find(x=>x.code===code_); const M=G.spline.length,k=Math.floor(c.s*M)%M,p=G.spline[k];
 const head=((c.worldAngle-Math.atan2(p.ty,p.tx))*57.3+540)%360-180;
 const nb=(c._nb||[]).filter(n=>Math.abs(n.gapM)<25).map(n=>`${n.o.code}${n.gapM.toFixed(0)}/${n.latRel.toFixed(1)}`).join(",");
 console.log(`${G.state.raceTime.toFixed(2)} s${c.s.toFixed(4)} lat${c.dLat.toFixed(2)} ln${G.carLineLat(c,c.s).toFixed(2)} cmd${(c._cmdLat||0).toFixed(1)} hdg${head.toFixed(0)} v${(c.speedMps*3.6).toFixed(0)} want${(c._w1*3.6).toFixed(0)}/${(c._w3*3.6).toFixed(0)} brk${c.brake.toFixed(2)} thr${c.throttle.toFixed(2)} gL${(c.gLong||0).toFixed(1)} gLat${(c.gLat||0).toFixed(1)} gam${(c.gammaTire||0).toFixed(2)} mu${(c.muEff||0).toFixed(2)} yaw${(c.yawDrift||0).toFixed(2)} vS${(c.vSide||0).toFixed(1)}${c.attacking?" ATK":""}${c.defending?" DEF":""}${c.escapeT>0?" ESC":""}${c.mistakeT>0?" ERR":""}${c.lateBrake>0?" LB":""}${c.blueFlag?" BLUE":""} kP${(p.kPlan||0).toFixed(3)} nb[${nb}]`);}
