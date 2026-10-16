// Follow the closest battle: print attacker/defender state every 0.5 s for a while
const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3], A=process.argv[4], secs=+process.argv[5]||300, from=+process.argv[6]||200;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace("const kappa = clamp(kappaCmd, -kMax, kMax);","const kappa = clamp(kappaCmd, -kMax, kMax); c._dbg={want:desiredSpeedMps,plan:c._planV,cmdLat};");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
vm.runInContext(`for(let i=0;i<${180*from};i++) stepPhysics(1/180);`,ctx);
for(let k=0;k<secs*2;k++){
  vm.runInContext(`for(let i=0;i<90;i++) stepPhysics(1/180);`,ctx);
  console.log(vm.runInContext(`(()=>{const c=cars.find(x=>x.code==="${A}");const n=c._nb.filter(x=>!x.o.dnf&&x.gapM>-15).sort((a,b)=>Math.abs(a.gapM)-Math.abs(b.gapM))[0];
   if(!n)return "t="+state.raceTime.toFixed(1)+" alone";const d=c._dbg||{};
   return "t="+state.raceTime.toFixed(1)+" s="+c.s.toFixed(3)+" "+c.code+" v="+(c.speedMps*3.6).toFixed(0)+" want="+(d.want*3.6).toFixed(0)+" plan="+(d.plan*3.6).toFixed(0)+" | "+n.o.code+" gap="+n.gapM.toFixed(1)+" lat="+n.latRel.toFixed(1)+" v="+(n.o.speedMps*3.6).toFixed(0)+" | atk="+c.attacking+" side="+c.passSide+" tow="+c.towFactor.toFixed(2)+" dirty="+c.dirtyAir.toFixed(2)+" mode="+c.aeroMode+" ers="+c.ers.toFixed(2)+" k="+(getSplinePt(c.s).kPlan||0).toFixed(3)+" | stats "+JSON.stringify(state.stats);})()`,ctx));
}
