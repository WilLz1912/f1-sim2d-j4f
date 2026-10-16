// quick smoke test: run N sim seconds and print state
const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3]||"barcelona", secs=+process.argv[4]||120;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
let a=12345;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const M=Object.create(Math);M.random=rnd;
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`var __L=[];logMsg=t=>__L.push(state.raceTime.toFixed(1)+" "+t);showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const t0=Date.now();
vm.runInContext(`for(let i=0;i<${60*secs};i++) stepPhysics(1/60);`,ctx);
console.log("wall",((Date.now()-t0)/1000).toFixed(1),"s");
console.log(vm.runInContext(`"ideal lap est "+state.idealLapEstimate.toFixed(1)+" | t="+state.raceTime.toFixed(0)+" leaderLap="+state.leaderLap+" rc="+state.raceControl+"\\n"+orderCars().map(c=>c.pos+"."+c.code+" L"+c.lap+" "+(c.speedMps*3.6).toFixed(0)+"kmh dLat="+c.dLat.toFixed(1)+(c.dnf?" DNF":"")+(c.inPit?" PIT:"+c.pitPhase:"")).join("\\n")+"\\n--- log\\n"+__L.slice(-40).join("\\n")`,ctx));
