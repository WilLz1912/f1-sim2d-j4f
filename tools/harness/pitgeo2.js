const fs=require("fs"),vm=require("vm");
const [path]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>Date.now()},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({pitPath,pitComplexGeom,unitToMeter,CIRCUITS});',ctx);
for(const t of ["barcelona","imola","monza"]){
 vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${t}";initRace();`,ctx);
 const G=ctx.__g(), P=G.pitPath, u=G.unitToMeter;
 const b=Object.values(P.boxM).sort((a,b)=>a-b);
 console.log(t,"pitLoss",G.CIRCUITS[t].pitLossSec,"pathTotal",P.totalM.toFixed(0),"fastLane",(P.fastEndM-P.fastStartM).toFixed(0),"limitZone",(P.limitEndM-P.limitStartM).toFixed(0),"boxSpacing",(b[1]-b[0]).toFixed(1),"m unitToMeter",u.toFixed(3), "laneOffset fast", (8.2+7.2)*u, "work",(8.2+11.4)*u);
}
