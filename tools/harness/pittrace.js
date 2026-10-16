const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3]||"imola";
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`var __L=[];logMsg=t=>__L.push(state.raceTime.toFixed(1)+" "+t);showToast=()=>{};activeTrackKey="${track}";initRace();cars=[cars.find(c=>c.code==="VER")];cars[0].idx=0;state.raceControl="GREEN";cars[0].reactionDelay=0;cars[0].pitRequested=true;cars[0].nextCompound="H";`,ctx);
console.log(vm.runInContext(`JSON.stringify({total:pitPath.totalM.toFixed(0),fastStart:pitPath.fastStartM.toFixed(0),fastEnd:pitPath.fastEndM.toFixed(0),limitStart:pitPath.limitStartM.toFixed(0),limitEnd:pitPath.limitEndM.toFixed(0),box:cars[0].team.code3+":"+pitPath.boxM[cars[0].team.code3].toFixed(0)})`,ctx));
let last="";
for(let i=0;i<180*140;i++){
  vm.runInContext("stepPhysics(1/180)",ctx);
  const c=vm.runInContext("({ph:cars[0].pitPhase,arc:cars[0].pitArcM,v:cars[0].speedMps*3.6,s:cars[0].s,inPit:cars[0].inPit,com:cars[0].pitCommitted,dLat:cars[0].dLat,t:state.raceTime})",ctx);
  const key=c.ph+Math.floor(c.arc/15)+(c.com?"C":"");
  if((c.inPit||c.com) && key!==last){last=key;console.log(`t=${c.t.toFixed(1)} ${c.inPit?"PIT "+c.ph:"track(committed)"} arc=${c.arc.toFixed(0)} v=${c.v.toFixed(0)} s=${c.s.toFixed(3)} dLat=${c.dLat.toFixed(1)}`);}
}
console.log(vm.runInContext("__L.join('\\n')",ctx));
