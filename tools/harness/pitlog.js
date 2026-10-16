const fs=require("fs"),vm=require("vm");
const path=process.argv[2],track=process.argv[3],seed=+process.argv[4]||4,laps=+process.argv[5]||0;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true});}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);
vm.runInContext(code+'\n;globalThis.__get=()=>({state,cars,TYRE_SPECS,CIRCUITS});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";${laps?`CIRCUITS["${track}"].totalLaps=${laps};`:""}initRace();`,ctx);
const prev={};const dt=1/60;
for(let i=0;i<60*9000;i++){ctx.stepPhysics(dt);const g=ctx.__get(),st=g.state;if(st.raceOver)break;
 for(const c of g.cars){if(c.pitRequested&&!prev[c.idx]){const p=c.plan||{};console.log(`L${c.lap} ${c.code} rc=${st.raceControl} comp=${c.compound} wear=${c.wear.toFixed(3)} cliff=${g.TYRE_SPECS[c.compound].cliff} wing=${(c.wingDamage||0).toFixed(2)} flat=${(c.flatspot||0).toFixed(2)} punct=${c.puncture} plan stops=${p.stops} stopLap=${p.stopLap} next=${p.nextComp} traffic=${(c.pitTraffic||0).toFixed(1)} mgmt=${(c.tyreMgmt||0).toFixed(2)} stint=${c.stintStartLap}`);}prev[c.idx]=c.pitRequested;}}
