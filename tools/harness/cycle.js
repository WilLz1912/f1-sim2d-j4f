// Forced SC cycle and red flag: phases complete, no contacts, race resumes
const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3], mode=process.argv[4];
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(3);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`var __L=[];logMsg=t=>__L.push(state.raceTime.toFixed(0)+" "+t);showToast=()=>{};activeTrackKey="${track}";initRace();
var __C=0;var __rc=registerContact;registerContact=function(A,B,cl,n,fa,fb,L){ if(cl>=6) { __C++; __L.push(state.raceTime.toFixed(0)+" CONTACT "+A.code+"-"+B.code+" "+cl.toFixed(1)+" rc="+state.raceControl); } return __rc(A,B,cl,n,fa,fb,L); };`,ctx);
let phases=[];let last="";
vm.runInContext(`for(let i=0;i<180*200;i++) stepPhysics(1/180);`,ctx);
vm.runInContext(mode==="red" ? `initiateGradualRedFlag("test")` : `deploySafetyCar("test")`,ctx);
for(let k=0;k<180*700;k++){
  vm.runInContext("stepPhysics(1/180)",ctx);
  const ph=vm.runInContext("state.raceControl+'/'+state.scCar.phase",ctx);
  if(ph!==last){phases.push(vm.runInContext("state.raceTime.toFixed(0)",ctx)+":"+ph);last=ph;}
}
console.log(track, mode, "phases:", phases.join(" -> "));
console.log("contacts>=6:", vm.runInContext("__C",ctx), "| lap", vm.runInContext("state.leaderLap",ctx), "| running", vm.runInContext("cars.filter(c=>!c.dnf).length",ctx));
console.log(vm.runInContext("__L.filter(t=>/CONTACT|DNF|restart|Restart|GREEN|Lapped|intercepted|in this lap|RED/i.test(t)).slice(0,14).join('\\n')",ctx));
