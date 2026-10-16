const fs=require("fs"),vm=require("vm");
const [path,track,seed,secs]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,spline,CORNER_OF,CORNERS,RACE_HALF,HALF_TRACK,carLineLat});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g; const was={}; const hist={};
const NM=["STD","V","LATE","U"];
for(let i=0;i<60*+secs;i++){ctx.stepPhysics(1/60);const G=g();
 for(const c of G.cars){ if(c.dnf||c.inPit) continue; const M=G.spline.length,k=Math.floor(c.s*M)%M;
  const h=hist[c.idx]||(hist[c.idx]=[]); h.push(`${c.s.toFixed(3)} lat${c.dLat.toFixed(1)} line${(G.carLineLat(c,c.s)).toFixed(1)} v${(c.speedMps*3.6).toFixed(0)} ${NM[c.lineNow||0]} atk${c.attacking?1:0} def${c.defending?1:0} esc${c.escapeT>0?1:0} brk${c.brake.toFixed(1)}`); if(h.length>90)h.shift();
  const off=Math.abs(c.dLat)>G.HALF_TRACK+0.5;
  if(off && !was[c.idx]){ console.log(`\nt=${G.state.raceTime.toFixed(1)} ${c.code} OFF at s=${c.s.toFixed(3)} corner=${G.CORNER_OF[k]} lineNow=${NM[c.lineNow||0]} sel=${Array.from(c.lineSel||[]).map(x=>NM[x][0]).join("")}`); console.log("  "+h.filter((_,j)=>j%10===0).join("\n  ")); }
  was[c.idx]=off; }
 }
