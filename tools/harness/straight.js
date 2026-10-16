// For followers: gap at straight start vs end, with energy states mid-straight
const fs=require("fs"),vm=require("vm");
const [path,track,seed,laps,sA,sM,sB]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";CIRCUITS["${track}"].totalLaps=${laps};initRace();`,ctx);
const g=ctx.__g; const open={}, rec=[]; const prevS={};
const cross=(p,n,x)=> (n-p>0&&n-p<0.01&&p<x&&n>=x)||(p-n>0.5&&(x>p||x<=n));
for(let i=0;i<60*6000;i++){ctx.stepPhysics(1/60);const st=g().state;if(st.raceOver)break; if(st.raceControl!=="GREEN"||st.leaderLap<3){for(const c of g().cars)prevS[c.idx]=c.s;continue;}
 for(const c of g().cars){ if(c.dnf||c.inPit){prevS[c.idx]=c.s;continue;} const p=prevS[c.idx]; prevS[c.idx]=c.s; if(p===undefined)continue;
  const ahead=g().cars.filter(o=>o!==c&&!o.dnf&&!o.inPit&&o.totalDistM>c.totalDistM&&o.totalDistM-c.totalDistM<90).sort((a,b)=>a.totalDistM-b.totalDistM)[0];
  if(cross(p,c.s,+sA)&&ahead) open[c.idx]={o:ahead,g0:ahead.totalDistM-c.totalDistM,v0:c.speedMps*3.6,vo0:ahead.speedMps*3.6};
  const e=open[c.idx]; if(!e)continue;
  if(cross(p,c.s,+sM)){e.ersA=c.ers;e.ersD=e.o.ers;e.modeA=c.aeroMode;e.modeD=e.o.aeroMode;e.momA=c.momEnergy;e.vA=c.speedMps*3.6;e.vD=e.o.speedMps*3.6;e.tow=c.towFactor;e.tac=e.o.energyTactic;e.justMid=true;continue;} e.justMid=false;
  if(cross(p,c.s,+sB)&&e.vA!==undefined&&!e.justMid){e.g1=e.o.totalDistM-c.totalDistM;e.vmaxA=c.speedMps*3.6;e.vmaxD=e.o.speedMps*3.6;rec.push(e);delete open[c.idx];}
 }}
const fmt=x=>x===undefined?"-":(+x).toFixed(1);
rec.sort((a,b)=>a.g0-b.g0);
console.log("n",rec.length,"median gain m",fmt(rec.map(r=>r.g0-r.g1).sort((a,b)=>a-b)[rec.length>>1]));
for(const r of rec.filter(r=>r.g0<40).slice(0,40)) console.log(`g0 ${fmt(r.g0)} -> g1 ${fmt(r.g1)} | mid vA ${fmt(r.vA)} vD ${fmt(r.vD)} modeA ${r.modeA} modeD ${r.modeD} ersA ${fmt(r.ersA*100)} ersD ${fmt(r.ersD*100)} mom ${fmt(r.momA)} tow ${fmt(r.tow)} defTac ${r.tac||""} | end vA ${fmt(r.vmaxA)} vD ${fmt(r.vmaxD)}`);
