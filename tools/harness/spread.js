// Solo lap time (lap 2, clean air, medium tyres) for every driver
const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3]||"barcelona";
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();var __all=cars.slice();`,ctx);
const res=vm.runInContext(`(()=>{const out=[];for(const d of __all){ initRace(); const c=cars.find(x=>x.code===d.code); cars=[c]; c.idx=0; c.compound="M"; c.usedCompounds=new Set(["M"]); state.raceControl="GREEN"; c.reactionDelay=0; c.failMode=null;
  let t1=null,t2=null; for(let i=0;i<60*400;i++){ stepPhysics(1/60); if(c.lap===2&&t1===null)t1=state.raceTime; if(c.lap===3){t2=state.raceTime;break;} }
  out.push([c.code,c.team.code3,(t2-t1).toFixed(2)]);} return out;})()`,ctx);
res.sort((a,b)=>a[2]-b[2]); const best=+res[0][2];
res.forEach(r=>console.log(r[0],r[1],r[2],"+"+(r[2]-best).toFixed(2)));
