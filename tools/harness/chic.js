const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,spline,RACE_HALF,HALF_TRACK});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();cars=[cars.find(c=>c.code==="VER")];cars[0].idx=0;state.raceControl="GREEN";cars[0].reactionDelay=0;`,ctx);
const g=ctx.__g; const zones=[[0.095,0.135],[0.26,0.30],[0.56,0.60]]; let lap=1; const res={};
for(let i=0;i<60*300;i++){ctx.stepPhysics(1/60);const c=g().cars[0];if(c.lap>=3)break;if(c.lap<2)continue;
 zones.forEach((z,j)=>{if(c.s>z[0]&&c.s<z[1]){const r=res[j]||(res[j]={vmin:1e9,maxLat:0,maxDev:0,maxG:0,kplan:0});r.vmin=Math.min(r.vmin,c.speedMps*3.6);r.maxLat=Math.max(r.maxLat,Math.abs(c.dLat));const sp=g().spline[Math.floor(c.s*g().spline.length)];r.maxDev=Math.max(r.maxDev,Math.abs(c.dLat-sp.idealLat));r.maxG=Math.max(r.maxG,c.gammaTire||0);r.kplan=Math.max(r.kplan,sp.kPlan);}});}
console.log(path, JSON.stringify(Object.fromEntries(Object.entries(res).map(([k,r])=>[zones[k].join("-"),{vmin:+r.vmin.toFixed(0),maxLat:+r.maxLat.toFixed(1),dev:+r.maxDev.toFixed(1),gamma:+r.maxG.toFixed(2),kPlan:+r.kplan.toFixed(4)}]))), "RACE_HALF",g().RACE_HALF);
