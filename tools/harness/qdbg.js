const fs=require("fs"),vm=require("vm");
const [path,track,seed]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI});',ctx);
console.log("after load session", ctx.__g().state.session, "QUALI", !!ctx.__g().QUALI, ctx.__g().QUALI&&!!ctx.__g().QUALI.prep);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";startWeekend(true);`,ctx);
console.log("after startWeekend", ctx.__g().state.session, !!ctx.__g().QUALI.prep);
for(let i=0;i<5;i++){ctx.stepPhysics(1/60);} console.log("after 5 steps", ctx.__g().state.session);
let last=""; for(let i=0;i<60*3600;i++){ctx.stepPhysics(1/60); const s=ctx.__g().state.session; if(s!==last){console.log("t",i/60,s); last=s;} if(s==="QEND")break;}
const Q=ctx.__g().QUALI; console.log("grid", Q.grid&&Q.grid.slice(0,10).map(c=>c+" "+(Q.res[c].Q3||Q.res[c].Q2||Q.res[c].Q1||0).toFixed(3)).join(" | "));
