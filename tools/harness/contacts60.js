const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3]||"monza", secs=+process.argv[4]||600;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(+process.argv[5]||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`var __C=[];var __L=[];logMsg=t=>__L.push(state.raceTime.toFixed(1)+" "+t);showToast=()=>{};
var __rc=registerContact; registerContact=function(A,B,closing,n,fa,fb,L){
  const along=Math.max(Math.abs(n[0]*fa[0]+n[1]*fa[1]),Math.abs(n[0]*fb[0]+n[1]*fb[1]));
  const gap=wrapDs(B.s-A.s)*L;
  if(closing>=6) __C.push({t:state.raceTime.toFixed(1),rc:state.raceControl,A:A.code,B:B.code,cl:closing.toFixed(1),rear:along>0.72,gapAB:gap.toFixed(1),vA:(A.speedMps*3.6).toFixed(0),vB:(B.speedMps*3.6).toFixed(0),latA:A.dLat.toFixed(1),latB:B.dLat.toFixed(1),offA:A.targetLaneOffset.toFixed(1),offB:B.targetLaneOffset.toFixed(1),
    k:getSplinePt(A.s).kLine.toFixed(4),s:A.s.toFixed(3),brkA:A.brake.toFixed(2),brkB:B.brake.toFixed(2),pitA:A.pitCommitted,pitB:B.pitCommitted,dnfA:A.dnf,dnfB:B.dnf,lapA:A.lap,lapB:B.lap,blueA:A.blueFlag,blueB:B.blueFlag,atkA:A.attacking,atkB:B.attacking,defA:A.defending,defB:B.defending,mistA:A.mistakeT>0,mistB:B.mistakeT>0,lbA:A.lateBrake>0,lbB:B.lateBrake>0,nbA:((x)=>x?{gapM:x.gapM,latRel:x.latRel}:{})(A._nb.find(n=>n.o===B)),nbB:((x)=>x?{gapM:x.gapM,latRel:x.latRel}:{})(B._nb.find(n=>n.o===A)),headA:(A.worldAngle*57.3).toFixed(0),headB:(B.worldAngle*57.3).toFixed(0)});
  return __rc(A,B,closing,n,fa,fb,L);};
activeTrackKey="${track}";initRace();`,ctx);
vm.runInContext(`for(let i=0;i<${60*secs};i++) stepPhysics(1/60);`,ctx);
const C=vm.runInContext("__C",ctx);
console.log("contacts>=6:",C.length,"rear:",C.filter(c=>c.rear).length);
C.slice(0,60).forEach(c=>console.log(JSON.stringify(c)));
