const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3];
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const res=[];
const codes=["ANT","RUS","NOR","PIA","LEC","HAM","VER","HAD","SAI","ALB","LAW","LIN","GAS","COL","OCO","BEA","HUL","BOR","ALO","STR","PER","BOT"];
for(const cd of codes){
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();cars=[cars.find(c=>c.code==="${cd}")];cars[0].idx=0;state.raceControl="GREEN";cars[0].reactionDelay=0;cars[0].compound="M";cars[0].failMode=null;for(const k in TYRE_SPECS)TYRE_SPECS[k].wear=0;`,ctx);
let last=1,t0=0,out=[];
for(let i=0;i<60*500;i++){vm.runInContext("stepPhysics(1/60)",ctx);const c=vm.runInContext("({lap:cars[0].lap,t:state.raceTime})",ctx);if(c.lap>last){out.push(c.t-t0);last=c.lap;t0=c.t;if(out.length>=3)break;}}
res.push([cd,Math.min(out[1],out[2])]);}
res.sort((a,b)=>a[1]-b[1]);console.log(track, res.map(r=>r[0]+" "+r[1].toFixed(2)+"(+"+(r[1]-res[0][1]).toFixed(2)+")").join(" | "));
