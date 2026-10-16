// Trace one attacker/defender pair along the lap: gap, speeds, tow, mode, ERS, lateral
const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3], A=process.argv[4], Dd=process.argv[5], t0=+process.argv[6], dur=+process.argv[7]||40;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace("const kappa = clamp(kappaCmd, -kMax, kMax);","const kappa = clamp(kappaCmd, -kMax, kMax); c._dbg={want:desiredSpeedMps,plan:c._planV,cmdLat,w1:c._w1,w2:c._w2,w3:c._w3};");
code=code.replace("  // ---------------- G. Lane choice (target lateral position) ----------------","  c._w1 = desiredSpeedMps;\n  // ---------------- G. Lane choice (target lateral position) ----------------");
code=code.replace("  // ---------------- H. Traffic radar on the physical neighbours ----------------","  c._w2 = desiredSpeedMps;\n  // ---------------- H. Traffic radar on the physical neighbours ----------------");
code=code.replace("  // ---------------- I. Power unit, active aero, ERS (2026 rules) ----------------","  c._w3 = desiredSpeedMps;\n  // ---------------- I. Power unit, active aero, ERS (2026 rules) ----------------");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";CIRCUITS["${track}"].totalLaps=25;initRace();while(state.raceTime<${t0}) stepPhysics(1/60);`,ctx);
for(let k=0;k<dur*4;k++){
  vm.runInContext(`for(let i=0;i<15;i++) stepPhysics(1/60);`,ctx);
  console.log(vm.runInContext(`(()=>{const a=cars.find(x=>x.code==="${A}"),d=cars.find(x=>x.code==="${Dd}");const g=d.totalDistM-a.totalDistM;const dbg=a._dbg||{};
   return "t="+state.raceTime.toFixed(1)+" s="+a.s.toFixed(3)+" gap="+g.toFixed(1)+" vA="+(a.speedMps*3.6).toFixed(0)+" vD="+(d.speedMps*3.6).toFixed(0)+" plan="+(dbg.plan*3.6).toFixed(0)+" afterRC="+(dbg.w1*3.6).toFixed(0)+" afterSide="+(dbg.w2*3.6).toFixed(0)+" afterRadar="+(dbg.w3*3.6).toFixed(0)+" thr="+a.throttle.toFixed(2)+" gLat="+a.gLat.toFixed(1)+" | A:"+a.aeroMode+" ers"+a.ers.toFixed(2)+" tow"+a.towFactor.toFixed(2)+" dirty"+a.dirtyAir.toFixed(2)+" atk"+(a.attacking?1:0)+" lat"+a.dLat.toFixed(1)+" | D:"+d.aeroMode+" ers"+d.ers.toFixed(2)+" lat"+d.dLat.toFixed(1)+" def"+(d.defending?1:0);})()`,ctx));
}
