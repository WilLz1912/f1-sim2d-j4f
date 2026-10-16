const fs=require("fs"),vm=require("vm");
const [path,track,seed]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,orderCars,CIRCUITS});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g; const L=g().CIRCUITS[track].lengthMeters; const wasIn={}; let n=0, lappedAhead=0, sameLapAhead=0;
for(let i=0;i<60*6000;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.raceOver)break;
 for(const c of G.cars){ if(wasIn[c.idx] && !c.inPit && !c.dnf){ // just rejoined
   const ord=G.orderCars().filter(x=>!x.dnf);
   // physically ahead within 250 m on track
   const ahead=G.cars.filter(o=>o!==c&&!o.dnf&&!o.inPit).map(o=>({o,d:(((o.s-c.s)%1)+1)%1*L})).filter(x=>x.d<250).sort((a,b)=>a.d-b.d);
   const desc=ahead.map(x=>{const lapsDown=Math.round((c.totalDistM-x.o.totalDistM)/L - x.d/L); const rankedBehind=ord.indexOf(x.o)>ord.indexOf(c); if(rankedBehind){ if(lapsDown>=1) lappedAhead++; else sameLapAhead++; } return `${x.o.code}(+${x.d.toFixed(0)}m P${ord.indexOf(x.o)+1}${lapsDown>=1?" BỊ BẮT "+lapsDown+" VÒNG":""})`;});
   n++; if(desc.length) console.log(`L${G.state.leaderLap} ${G.state.raceControl} ${c.code} ra pit ở P${ord.indexOf(c)+1}, phía trước trên đường: ${desc.join(", ")}`);
 } wasIn[c.idx]=c.inPit; }
}
console.log(`\nTổng ${n} lần ra pit. Xe đứng trước trên đường nhưng xếp sau: bị bắt vòng ${lappedAhead}, cùng vòng ${sameLapAhead}`);
