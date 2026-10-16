const fs=require("fs"),vm=require("vm");
const [path,track,who,a,b]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
function mulberry32(x){return function(){x|=0;x=x+0x6D2B79F5|0;let t=Math.imul(x^x>>>15,1|x);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(5);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,carLineLat,getSplinePt});',ctx);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace(); cars=[cars.find(c=>c.code==="${who||"RUS"}")]; cars[0].failAtM=1e15; cars[0].failMode=null;`,ctx);
const g=ctx.__g; let lapsSeen=0,last=null;
for(let i=0;i<60*400;i++){ctx.stepPhysics(1/60);const G=g(),c=G.cars[0]; if(G.state.raceControl==="FORMATION"||G.state.raceControl==="START_LIGHTS")continue;
 if(c.lap!==last){last=c.lap;lapsSeen++; if(lapsSeen===3){c.pitRequested=true;c.nextCompound="M";} if(lapsSeen>5)break;}
 if(lapsSeen===4 && c.s>=+a && c.s<=+b && i%6===0) console.log(`pc${c.pitCommitted?1:0} inPit${c.inPit?1:0} s${c.s.toFixed(4)} v${(c.speedMps*3.6).toFixed(0)} lat${c.dLat.toFixed(2)} line${G.carLineLat(c,c.s).toFixed(2)} thr${(c.throttle||0).toFixed(2)} brk${(c.brake||0).toFixed(2)} kPlan${(G.getSplinePt(c.s).kPlan||0).toFixed(4)}`);
}
