const fs=require("fs"),vm=require("vm");
const [path,track,seed,tSC,pos]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,orderCars,deploySafetyCar});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g; let fired=false,t0=0,car=null;
for(let i=0;i<60*3000;i++){ctx.stepPhysics(1/60);const G=g();
 if(!fired && G.state.raceTime>+tSC && G.state.raceControl==="GREEN"){ G.deploySafetyCar("TEST"); fired=true; t0=G.state.raceTime; car=G.orderCars().filter(c=>!c.dnf)[+pos-1]; }
 if(fired){ for(const c of G.cars) c.pitRequested=false;
  if(i%60===0){const o=G.orderCars().filter(c=>!c.dnf&&!c.inPit); const j=o.indexOf(car); const f=o[j-1];
   console.log(`t+${(G.state.raceTime-t0).toFixed(0)} ${car.code} P${j+1} s=${car.s.toFixed(3)} v=${(car.speedMps*3.6).toFixed(0)} gapToAhead=${f?(f.totalDistM-car.totalDistM).toFixed(0):"-"}m vAhead=${f?(f.speedMps*3.6).toFixed(0):"-"} | plan=${(car._w0*3.6).toFixed(0)} afterCaution=${(car._w1*3.6).toFixed(0)} afterLane=${(car._w2*3.6).toFixed(0)} afterRadar=${(car._w3*3.6).toFixed(0)}`);}
  if(G.state.raceTime-t0>150) break; }
}
