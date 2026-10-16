const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3], grip=+process.argv[4];
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();cars=[cars.find(c=>c.code==="VER")];cars[0].idx=0;state.raceControl="GREEN";cars[0].reactionDelay=0;TYRE_SPECS.M.grip=${grip};cars[0].compound="M";TYRE_SPECS.M.wear=0;`,ctx);
let last=1,t0=0,out=[];
for(let i=0;i<60*400;i++){vm.runInContext("stepPhysics(1/60)",ctx);const c=vm.runInContext("({lap:cars[0].lap,t:state.raceTime})",ctx);if(c.lap>last){out.push((c.t-t0).toFixed(2));last=c.lap;t0=c.t;if(out.length>=4)break;}}
console.log(track,grip,out.join(" "));
