const fs=require("fs"),vm=require("vm");
const [path,track,seed,who,tA,tB]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,carLineLat});',ctx);
const EV=[];
vm.runInContext(`showToast=()=>{};activeTrackKey="${track}";initRace();logMsg=t=>{if(/DNF|VSC deployed|Safety Car exits|beached|barrier|spins|mistake|locks/i.test(t))0};`,ctx);
const g=ctx.__g;
for(let i=0;i<60*6000;i++){ctx.stepPhysics(1/60);const G=g(); const t=G.state.raceTime; if(t>+tB)break; if(t<+tA)continue;
 const c=G.cars.find(x=>x.code===who); if(i%3) continue;
 console.log(`t${t.toFixed(2)} s${c.s.toFixed(4)} v${(c.speedMps*3.6).toFixed(0)} plan${((c._planV||0)*3.6).toFixed(0)} lat${c.dLat.toFixed(1)}/ln${G.carLineLat(c,c.s).toFixed(1)} b${c.brake.toFixed(2)} mu${(c.muEff||0).toFixed(3)} lb${c.lateBrake>0?c.lateBrake.toFixed(1):0} err${c.mistakeT>0?c.mistakeT.toFixed(1):0} tow${(c.towFactor||0).toFixed(2)} xi${(c.xiBrake||0).toFixed(3)} gLat${(c.gLat||0).toFixed(2)} gLon${(c.gLong||0).toFixed(2)} esc${c.escapeT>0?1:0} lu${(c.latUse||0).toFixed(2)} ${c.aeroMode}`);
}
