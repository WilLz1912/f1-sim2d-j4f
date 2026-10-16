const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3]||"barcelona", s0=+process.argv[4], s1=+process.argv[5];
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
// expose internals
code=code.replace("const kappa = clamp(kappaCmd, -kMax, kMax);","const kappa = clamp(kappaCmd, -kMax, kMax); c._dbg={kappaCmd,kMax,desiredSpeedMps,cmdLat,alpha,LdAct,mu,lonUse,latUseReq};");
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();cars=[cars.find(c=>c.code==="VER")];cars[0].idx=0;state.raceControl="GREEN";cars[0].reactionDelay=0;`,ctx);
let lastS=-1;
for(let i=0;i<180*80;i++){
  vm.runInContext("stepPhysics(1/180)",ctx);
  const c=vm.runInContext("cars[0]",ctx);
  if(c.dnf) {console.log("DNF");break;}
  if(c.s>=s0 && c.s<=s1 && c.lap===1 && Math.floor(c.s*500)!==lastS){lastS=Math.floor(c.s*500);
    const p=vm.runInContext("getSplinePt(cars[0].s)",ctx); const d=c._dbg||{};
    console.log(`s=${c.s.toFixed(3)} v=${(c.speedMps*3.6).toFixed(0)} want=${(d.desiredSpeedMps*3.6).toFixed(0)} Rline=${(1/Math.abs(p.kLine)).toFixed(0)} dLat=${c.dLat.toFixed(1)} ideal=${p.idealLat.toFixed(1)} cmd=${(d.cmdLat||0).toFixed(1)} kCmdR=${(1/Math.abs(d.kappaCmd)).toFixed(0)} kMaxR=${(1/d.kMax).toFixed(0)} mu=${(d.mu||0).toFixed(2)} brk=${c.brake.toFixed(2)} lon=${(d.lonUse||0).toFixed(2)} latReq=${(d.latUseReq||0).toFixed(2)}`);}
  if(c.lap>1) break;
}
