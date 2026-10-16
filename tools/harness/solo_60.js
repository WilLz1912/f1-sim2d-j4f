// Solo car: lap time, off-track excursions, where it leaves the line
const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3]||"barcelona", secs=+process.argv[4]||200;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`var __L=[];logMsg=t=>__L.push(state.raceTime.toFixed(1)+" "+t);showToast=()=>{};activeTrackKey="${track}";initRace();cars=[cars.find(c=>c.code==="VER")];cars[0].idx=0;state.raceControl="GREEN";cars[0].reactionDelay=0;`,ctx);
let lastLap=1, lapStart=0, maxLat=0, offs={}, worst=[];
for(let i=0;i<60*secs;i++){
  vm.runInContext("stepPhysics(1/60)",ctx);
  const c=vm.runInContext("({lap:cars[0].lap,s:cars[0].s,dLat:cars[0].dLat,ideal:getSplinePt(cars[0].s).idealLat,v:cars[0].speedMps,t:state.raceTime,dnf:cars[0].dnf,mu:cars[0].muEff,g:cars[0].gammaTire,k:getSplinePt(cars[0].s).kLine})",ctx);
  if(c.dnf){console.log("DNF at s",c.s.toFixed(3));break;}
  const dev=c.dLat-c.ideal; if(Math.abs(dev)>2.0){const key=c.s.toFixed(2); if(!offs[key]||Math.abs(dev)>Math.abs(offs[key].dev)) offs[key]={dev:+dev.toFixed(1),dLat:+c.dLat.toFixed(1),v:+(c.v*3.6).toFixed(0),g:+c.g.toFixed(2),R:(1/Math.abs(c.k)).toFixed(0)};}
  if(c.lap>lastLap){console.log("lap",lastLap,"time",(c.t-lapStart).toFixed(2));lastLap=c.lap;lapStart=c.t;}
}
console.log("off-line spots (s: deviation units, dLat, kmh, gamma, R line):");
for(const [k,o] of Object.entries(offs)) console.log(" s="+k, JSON.stringify(o));
console.log(vm.runInContext("__L.join('\\n')",ctx));
