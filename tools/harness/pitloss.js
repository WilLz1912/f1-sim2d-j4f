const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(5);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,CIRCUITS});',ctx);
function run(pitLap){
 vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace(); cars=[cars.find(c=>c.code==="VER")]; cars[0].failAtM=1e15; cars[0].failMode=null;`,ctx);
 const g=ctx.__g; let lastLap=null, t0=null, laps=[], stat=null;
 for(let i=0;i<60*900;i++){ctx.stepPhysics(1/60); const G=g(), c=G.cars[0];
  if(G.state.raceControl==="FORMATION"||G.state.raceControl==="START_LIGHTS") continue;
  if(c.lap!==lastLap){ if(lastLap!==null&&t0!==null) laps.push(G.state.raceTime-t0); t0=G.state.raceTime; lastLap=c.lap; if(c.lap===pitLap){c.pitRequested=true;c.nextCompound="M";} }
  if(c.lastStopDuration && stat===null) stat=c.lastStopDuration;
  if(laps.length>=6)break; }
 return {laps,stat};
}
const a=run(-1), b=run(4);
const T=x=>x.laps.slice(1,6).reduce((s,v)=>s+v,0);
console.log(track,"no-stop laps",a.laps.map(x=>x.toFixed(2)).join(" "),"| stop laps",b.laps.map(x=>x.toFixed(2)).join(" "),"stationary",b.stat&&b.stat.toFixed(2),"LOSS",(T(b)-T(a)).toFixed(2));
