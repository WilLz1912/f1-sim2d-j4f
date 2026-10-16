const fs=require("fs"),vm=require("vm");
const [path,track,seed,who,sessWanted]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI});',ctx);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";startWeekend();`,ctx);
const g=ctx.__g; let laps=[],cur=null,prevMode="";
for(let i=0;i<60*4000;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.session==="QEND")break;
 const c=G.cars.find(x=>x.code===who); if(G.state.session!==sessWanted){prevMode=c.qMode;continue;}
 if(c.qMode==="PUSH"&&prevMode!=="PUSH"){cur={t0:G.state.raceTime,v:new Array(50).fill(0),n:new Array(50).fill(0),near:0,grip:G.state.trackGripEvol,setup:c.setupQ,fuel:c.fuelKg,tT:[],mu:[]};}
 if(c.qMode==="PUSH"&&cur){const b=Math.min(49,Math.floor(c.s*50)); cur.v[b]+=c.speedMps; cur.n[b]++; if(i%60===0)cur.tT.push(c.tyreTemp.toFixed(0));}
 if(c.qMode!=="PUSH"&&prevMode==="PUSH"&&cur){cur.T=G.state.raceTime-cur.t0; laps.push(cur); cur=null;}
 prevMode=c.qMode;}
for(const l of laps){console.log(`T=${l.T.toFixed(2)} grip=${l.grip.toFixed(4)} setup=${l.setup.toFixed(3)} fuel=${(l.fuel||0).toFixed(1)} tT=${l.tT.join(",")}`); console.log("  v:",l.v.map((x,i)=>(x/Math.max(1,l.n[i])).toFixed(0)).join(" "));}
