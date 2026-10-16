const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace("function finishFormationLap(cfg) {","function finishFormationLap(cfg) {\n  __F(cars.filter(c=>!c.dnf).map(c=>({code:c.code,err:(c.grid.totalDistM+cfg.lengthMeters)-c.totalDistM,lat:c.dLat-c.grid.dLat,v:c.speedMps,temp:c.tyreTemp,ers:c.ers,done:c.formationDone})));");
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
let snap=null; ctx.__F=x=>{snap=x;};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars});',ctx);
const logs=[]; vm.runInContext(`showToast=()=>{};activeTrackKey="${track}";initRace();logMsg=t=>__L(t);`,ctx); ctx.__L=t=>logs.push(t);
const g=ctx.__g; let tF=null, tG=null;
for(let i=0;i<60*400;i++){ctx.stepPhysics(1/60);const st=g().state; if(st.raceControl==="START_LIGHTS"&&tF===null)tF=st.raceTime; if(st.raceControl==="GREEN"&&tG===null){tG=st.raceTime;break;}}
console.log("formation lap took",tF&&tF.toFixed(1),"s; lights out at",tG&&tG.toFixed(1),"s");
const e=snap.map(x=>Math.abs(x.err)), la=snap.map(x=>Math.abs(x.lat));
console.log("stop error vs slot: max",Math.max(...e).toFixed(2),"m (longitudinal), max",Math.max(...la).toFixed(2),"units lateral; all done:",snap.every(x=>x.done),"; tyre temp",Math.min(...snap.map(x=>x.temp)).toFixed(0),"-",Math.max(...snap.map(x=>x.temp)).toFixed(0),"°C; ERS",Math.min(...snap.map(x=>x.ers)).toFixed(2),"-",Math.max(...snap.map(x=>x.ers)).toFixed(2));
console.log("worst:",snap.sort((a,b)=>Math.abs(b.err)-Math.abs(a.err)).slice(0,4).map(x=>`${x.code} ${x.err.toFixed(1)}m lat${x.lat.toFixed(1)} v${x.v.toFixed(1)}`).join(" | "));
console.log("incidents:",logs.filter(t=>/contact|DNF|spin/i.test(t)).join(" | ")||"none");
