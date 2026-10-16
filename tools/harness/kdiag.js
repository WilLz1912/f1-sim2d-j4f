const fs=require("fs"),vm=require("vm");
const [path,track,a,b]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({spline,CIRCUITS,LINES,unitToMeter,HALF_TRACK});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const {spline,LINES,unitToMeter,HALF_TRACK}=ctx.__g(); const M=spline.length;
console.log("M",M,"unitToMeter",unitToMeter.toFixed(3),"HALF_TRACK units",HALF_TRACK);
for(let k=Math.floor(+a*M);k<=Math.floor(+b*M);k+=Math.max(1,Math.floor(M/1500))){
  const p=spline[k];
  console.log(`s${(k/M).toFixed(4)} curvC=${(p.curv||0).toFixed(4)} kLine=${(p.kLine||0).toFixed(4)} kPlan=${(p.kPlan||0).toFixed(4)} ideal=${p.idealLat.toFixed(2)} vEnv=${(p.vEnvelopeMps*3.6).toFixed(0)} L0=${LINES?LINES[0].lat[k].toFixed(2):"-"}`);
}
