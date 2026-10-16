const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);let t=Date.now();vm.runInContext(code,ctx);console.log("load",Date.now()-t);
t=Date.now();vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace();`,ctx);console.log("initRace#1",Date.now()-t);
t=Date.now();vm.runInContext(`for(let i=0;i<10;i++)initRace();`,ctx);console.log("initRace x10",Date.now()-t);
t=Date.now();vm.runInContext(`initRace(); cars=[cars[0]]; state.raceControl="GREEN"; for(let i=0;i<60*100;i++) stepPhysics(1/60);`,ctx);console.log("1 car 100 sim-s",Date.now()-t);
