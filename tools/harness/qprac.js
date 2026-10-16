const fs=require("fs"),vm=require("vm");
const [path,track,seed]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI});',ctx);
const t0=Date.now();
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";startWeekend(true);`,ctx);
console.log("wall",(Date.now()-t0)/1000); let t1=Date.now(); vm.runInContext("startWeekend()",ctx); console.log("2nd weekend wall",(Date.now()-t1)/1000);
const Q=ctx.__g().QUALI; console.log("mDelta",Q.mDelta.toFixed(3),"slope",Q.gripSlope.toFixed(1),"refLap",Q.refLap);
console.log(Object.entries(Q.ideal).sort((a,b)=>a[1]-b[1]).map(([k,v])=>k+" "+v.toFixed(3)).join("  "));
console.log("cars",ctx.__g().cars.length,"session",ctx.__g().state.session, "res", JSON.stringify(Q.res.VER));
