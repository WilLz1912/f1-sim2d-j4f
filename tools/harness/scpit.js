const fs=require("fs"),vm=require("vm");
const [path,track,seed]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,orderCars,deploySafetyCar});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g; let fired=false, watch=[];
for(let i=0;i<60*1800;i++){ctx.stepPhysics(1/60);const G=g();
 if(!fired && G.state.raceTime>900 && G.state.raceControl==="GREEN"){ G.deploySafetyCar("TEST"); fired=true; }
 if(fired && !watch.length && G.state.raceControl==="SC" && G.state.scCar.phase==="PARADE_BUNCHED"){
   const ord=G.orderCars().filter(c=>!c.dnf); watch=[ord[2],ord[7],ord[12]].filter(Boolean);
   watch.forEach(c=>{c.pitRequested=true;c.nextCompound="H";});
   console.log("t",G.state.raceTime.toFixed(0),"pitting:",watch.map(c=>c.code+" P"+(ord.indexOf(c)+1)).join(", "));
   console.log("order:",ord.map(c=>c.code).join(" "));
 }
 if(watch.length && i%60===0){const ord=G.orderCars().filter(c=>!c.dnf);
   console.log(`t${G.state.raceTime.toFixed(0)} ${G.state.raceControl}/${G.state.scCar.phase} `+watch.map(c=>`${c.code}:P${ord.indexOf(c)+1} ${c.inPit?c.pitPhase:"track"} d=${c.totalDistM.toFixed(0)}`).join(" | ")+`  | leader d=${ord[0].totalDistM.toFixed(0)}`);
   if(watch.every(c=>!c.inPit) && G.state.raceTime>1100) break;}
}
