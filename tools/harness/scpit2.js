const fs=require("fs"),vm=require("vm");
const [path,track,seed,tSC]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,orderCars,deploySafetyCar});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g; let fired=false, before=null, pitted=new Set(), sawGreen=false;
for(let i=0;i<60*3000;i++){ctx.stepPhysics(1/60);const G=g();
 if(!fired && G.state.raceTime>+tSC && G.state.raceControl==="GREEN"){ G.deploySafetyCar("TEST"); fired=true; before=G.orderCars().filter(c=>!c.dnf).map(c=>c.code); console.log("lap",G.state.leaderLap,"SC — order:",before.join(" ")); }
 if(fired){ for(const c of G.cars) if(c.inPit) pitted.add(c.code);
  if(G.state.raceControl==="GREEN"){ const after=G.orderCars().filter(c=>!c.dnf).map(c=>c.code);
    console.log("GREEN — order:",after.join(" "));
    console.log("pitted under SC:",[...pitted].length,"/",before.length, [...pitted].join(","));
    console.log("changes:",before.map((c,j)=>c+" "+(j+1)+"→"+(after.indexOf(c)+1)+(pitted.has(c)?"(pit)":"")).join("  "));
    break; } }
}
