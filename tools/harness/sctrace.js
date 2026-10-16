const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3]||"monza";
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(7);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
// no contacts consequences: we only want to see the queue behaviour
vm.runInContext(`var __L=[];logMsg=t=>__L.push(state.raceTime.toFixed(1)+" "+t);showToast=()=>{};activeTrackKey="${track}";initRace();
var __C=[];var __rc=registerContact;registerContact=function(A,B,cl,n,fa,fb,L){ if(cl>=4) __C.push(state.raceTime.toFixed(1)+" "+state.raceControl+"/"+state.scCar.phase+" "+A.code+"-"+B.code+" cl="+cl.toFixed(1)+" vA="+(A.speedMps*3.6).toFixed(0)+" vB="+(B.speedMps*3.6).toFixed(0)+" s="+A.s.toFixed(3)); };`,ctx);
vm.runInContext(`for(let i=0;i<180*130;i++){ stepPhysics(1/180); if(i===180*125) deploySafetyCar("test"); }`,ctx);
let lastPh="";
for(let k=0;k<180*260;k++){
  vm.runInContext("stepPhysics(1/180)",ctx);
  if(k%180===0){
    const r=vm.runInContext(`(()=>{const run=orderCars().filter(c=>!c.dnf&&!c.inPit);const sc=state.scCar;
      const gaps=[];for(let i=1;i<Math.min(8,run.length);i++){gaps.push(((run[i-1].totalDistM-run[i].totalDistM)-CAR_LENGTH*unitToMeter).toFixed(0));}
      return state.raceTime.toFixed(0)+" "+state.raceControl+"/"+sc.phase+" scV="+(sc.speedMps*3.6).toFixed(0)+" sc.s="+sc.s.toFixed(3)+" P1 s="+run[0].s.toFixed(3)+" v="+(run[0].speedMps*3.6).toFixed(0)+" | bumper gaps P1..P8: "+gaps.join(",")+" | speeds: "+run.slice(0,8).map(c=>(c.speedMps*3.6).toFixed(0)).join(",");})()`,ctx);
    if(k%(180*4)===0) console.log(r);
  }
}
console.log("contacts:");console.log(vm.runInContext("__C.slice(0,30).join('\\n')",ctx));
