const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3], seed=+process.argv[4], secs=+process.argv[5]||150;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`var __L=[];logMsg=t=>__L.push(state.raceTime.toFixed(1)+" "+t);showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
vm.runInContext(`for(let i=0;i<${180*secs};i++) stepPhysics(1/180);`,ctx);
const L=vm.runInContext("__L",ctx);
const cnt=re=>L.filter(t=>re.test(t)).length;
console.log(`${track} s${seed}: DNF ${cnt(/DNF:/)} | SC ${cnt(/Safety Car exits/)} | VSC ${cnt(/VSC deployed/)} | wing ${cnt(/makes contact/)} | punct ${cnt(/puncture/)} | light ${cnt(/Light contact/)} | pens ${cnt(/STEWARDS: \+/)}`);
if(process.argv[6]) L.filter(t=>/DNF|contact|puncture|Safety|STEWARDS|Pit Entry|released|stationary/.test(t)).slice(0,25).forEach(t=>console.log("   "+t));
