const fs=require("fs"),vm=require("vm");
const [path,track,seed,tSC]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,orderCars,deploySafetyCar});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g; let fired=false,t0=0;
for(let i=0;i<60*3000;i++){ctx.stepPhysics(1/60);const G=g();
 if(!fired && G.state.raceTime>+tSC && G.state.raceControl==="GREEN"){ for(const c of G.cars) c.pitRequested=false; G.deploySafetyCar("TEST"); fired=true; t0=G.state.raceTime;}
 if(fired){ for(const c of G.cars){c.pitRequested=false;}  // nobody pits: pure bunching test
  if(i%(60*10)===0){const o=G.orderCars().filter(c=>!c.dnf&&!c.inPit); const d=k=>(o[0].totalDistM-o[k].totalDistM);
   const gaps=o.slice(1).map((c,k)=>o[k].totalDistM-c.totalDistM);
   console.log(`t+${(G.state.raceTime-t0).toFixed(0)}s ${G.state.raceControl}/${G.state.scCar.phase} P1→P2 ${d(1).toFixed(0)}m P1→P10 ${d(9).toFixed(0)}m P1→last ${d(o.length-1).toFixed(0)}m  max gap ${Math.max(...gaps).toFixed(0)}m  median gap ${gaps.sort((a,b)=>a-b)[gaps.length>>1].toFixed(0)}m  v_leader ${(o[0].speedMps*3.6).toFixed(0)}`);}
  if(G.state.raceControl==="GREEN" && G.state.raceTime-t0>30) break; }
}
