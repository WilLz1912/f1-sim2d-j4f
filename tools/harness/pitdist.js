const fs=require("fs"),vm=require("vm");
const [path,track,seed,tPit]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,orderCars,CIRCUITS,deploySafetyCar});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g; const L=g().CIRCUITS[track].lengthMeters; let car=null, phase="";
// residual: totalDistM should equal (lap-1)*L + s*L + const ; compare the car to the field median
const resid=c=>{const r=c.totalDistM - c.s*L; return r - L*Math.round(r/L);};
for(let i=0;i<60*1600;i++){ctx.stepPhysics(1/60);const G=g();
 if(!car && G.state.raceTime>+tPit){ car=G.orderCars().filter(c=>!c.dnf)[2]; car.pitRequested=true; car.nextCompound="H"; console.log("forcing pit:",car.code); }
 if(car && i%30===0){ const others=G.cars.filter(c=>c!==car&&!c.dnf&&!c.inPit).map(resid).sort((a,b)=>a-b); const med=others[others.length>>1];
   const ph=car.inPit?car.pitPhase:"track";
   if(ph!==phase || i%120===0) console.log(`t${G.state.raceTime.toFixed(1)} ${ph.padEnd(12)} s=${car.s.toFixed(4)} totalDist=${car.totalDistM.toFixed(1)} residual-vs-field=${(resid(car)-med).toFixed(1)}m  P${G.orderCars().indexOf(car)+1}`);
   phase=ph; if(!car.inPit && G.state.raceTime>+tPit+40 && phase==="track" && car.__done){break;} if(car.inPit) car.__done=true; }
}
