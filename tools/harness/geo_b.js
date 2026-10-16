const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({spline,HALF_TRACK,RACE_HALF,unitToMeter,computeLineCurvature,CIRCUITS});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g(); const kc=g.computeLineCurvature(null,2); const M=kc.length;
// corners where centreline radius < half width (offset curves fold)
const halfM=g.HALF_TRACK*g.unitToMeter; let bad=[];
for(let k=0;k<M;k++){const R=1/Math.max(1e-6,Math.abs(kc[k])); if(R<halfM*1.05) bad.push([ (k/M).toFixed(3), R.toFixed(1)]);}
console.log(track,"half width m",halfM.toFixed(1),"RACE_HALF m",(g.RACE_HALF*g.unitToMeter).toFixed(1),"stations with centreline R < half width:",bad.length, bad.slice(0,20).map(b=>b.join("@")).join(" "));
