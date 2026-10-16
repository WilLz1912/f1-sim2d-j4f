const fs=require("fs"),vm=require("vm");
const [path,track,seed,who]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI});',ctx);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";startWeekend();`,ctx);
const g=ctx.__g; let prev="";
for(let i=0;i<60*4000;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.session==="QEND")break;
 const c=G.cars.find(x=>x.code===who);
 if(c.qMode==="PUSH"&&prev!=="PUSH"){ const o={}; for(const k of Object.keys(c)){const v=c[k]; if(typeof v==="number"||typeof v==="boolean"||typeof v==="string") o[k]=typeof v==="number"?+v.toFixed(3):v;} console.log(G.state.session, JSON.stringify(o)); }
 prev=c.qMode;}
