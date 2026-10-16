const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
function mulberry32(x){return function(){x|=0;x=x+0x6D2B79F5|0;let t=Math.imul(x^x>>>15,1|x);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(3);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,CORNERS,CIRCUITS,HALF_TRACK,LINE_TYPES});',ctx);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const G0=ctx.__g(); const nT=G0.LINE_TYPES.length; const C=G0.CORNERS;
console.log("corners(line family):",C.map((c,i)=>i+"@"+(c.iA/ (ctx.__g().cars.length?1:1)).toFixed(0)).join(" "));
for(let t=0;t<nT;t++){
  vm.runInContext(`initRace(); { const car=cars.find(c=>c.code==="RUS"); cars=[car]; car.failMode=null; car.failAtM=1e15; car.reactionDelay=0; car.lineSel=new Int8Array(CORNERS.length).fill(${t}); car.lineFixed=true; state.raceControl="GREEN"; }`,ctx);
  const G=ctx.__g(), car=G.cars[0]; let worst={}, lapT=0, t0=null;
  for(let i=0;i<60*320 && car.lap<=3;i++){ ctx.stepPhysics(1/60); if(car.lap<2) continue;
    const over=Math.abs(car.dLat)-G.HALF_TRACK; const key=(Math.round(car.s*100)/100).toFixed(2);
    if(over>-0.3){ worst[key]=Math.max(worst[key]||-9,over); } }
  console.log("line",t,G.LINE_TYPES[t]||"", "edge excursions (s:over units):", Object.entries(worst).map(([k,v])=>k+":"+v.toFixed(1)).join(" ")||"none", "dnf",car.dnf);
}
