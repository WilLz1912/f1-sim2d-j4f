const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3], seed=+process.argv[4], t0=+process.argv[5], t1=+process.argv[6], every=+process.argv[7]||10;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
vm.runInContext(`while(state.raceTime<${t0}) stepPhysics(1/60);`,ctx);
while(true){
  const done=vm.runInContext(`(()=>{const tEnd=state.raceTime+${every}; while(state.raceTime<tEnd) stepPhysics(1/60); return state.raceTime>${t1};})()`,ctx);
  console.log(vm.runInContext(`(()=>{const o=orderCars().filter(c=>!c.dnf);return state.raceTime.toFixed(0)+" "+state.raceControl+"/"+state.scCar.phase+" sc.s="+state.scCar.s.toFixed(3)+" scV="+(state.scCar.speedMps*3.6).toFixed(0)+" | "+o.slice(0,8).map(c=>c.code+" L"+c.lap+" s"+c.s.toFixed(3)+" "+(c.speedMps*3.6).toFixed(0)+(c.inPit?"P":"")+(c.escapeT>0?"E":"")).join(" | ");})()`,ctx));
  if(done) break;
}
