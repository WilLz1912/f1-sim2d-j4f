const fs=require("fs"),vm=require("vm");
let code=fs.readFileSync("v8.js","utf8");
// hook lap increment
code=code.replace("c.lap++;\n      evaluateContinuousPitOptimizer","__lapHook(c,prevS);c.lap++;\n      evaluateContinuousPitOptimizer");
const harness=fs.readFileSync("harness.js","utf8");
let a=0x9e37;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const M=Object.create(Math);M.random=rnd;
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);
ctx.__lapHook=(c,prevS)=>{ if(c.code===ctx.__tgt) console.log(`t=${vm.runInContext("state.raceTime",ctx).toFixed(2)} ${c.code} lap ${c.lap}->${c.lap+1} prevS=${prevS.toFixed(4)} s=${c.s.toFixed(4)} dist=${c.totalDistM.toFixed(0)} inPitBefore`)};
vm.runInContext(code,ctx);
vm.runInContext("logMsg=()=>{};showToast=()=>{};initRace();",ctx);
ctx.__tgt=vm.runInContext("cars[0].code",ctx);
for(let i=0;i<180*200;i++) vm.runInContext("stepPhysics(1/180)",ctx);
