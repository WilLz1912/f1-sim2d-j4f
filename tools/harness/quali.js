const fs=require("fs"),vm=require("vm");
const [path,track,seed]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI,fmtLap});',ctx);
const L=[]; ctx.__L=t=>L.push(t); vm.runInContext(`showToast=()=>{};logMsg=t=>__L(t);activeTrackKey="${track}";startWeekend();`,ctx);
const g=ctx.__g; const t0=Date.now(); let lastSess="";
for(let i=0;i<60*4000;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.session!==lastSess){lastSess=G.state.session; console.log("session ->",lastSess,"at sim t",G.state.raceTime.toFixed(0));} if(G.state.session==="QEND")break;}
const G=g(); console.log("wall",((Date.now()-t0)/1000).toFixed(0),"s; sim t",G.state.raceTime.toFixed(0));
const Q=G.QUALI; console.log("ORDER:",Q.order&&Q.order.map((c,i)=>`${i+1}.${c} ${G.fmtLap(Q.res[c].Q3||Q.res[c].Q2||Q.res[c].Q1)}`).join("  "));
console.log("grid:",Q.grid&&Q.grid.join(" "),"| pens:",JSON.stringify(Q.pen));
console.log("setup:",Object.entries(Q.setup).map(([k,v])=>k+" "+v.toFixed(3)).join(", "));
const ev=L.filter(t=>/goes P1|deleted|RED|STEWARDS|over|POLE|DNF|resumes|begins/.test(t)); console.log("events:",ev.length); ev.slice(-45).forEach(t=>console.log("  "+t));
