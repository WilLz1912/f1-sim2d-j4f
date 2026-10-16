const fs=require("fs"),vm=require("vm");
const [path,track,seed,who]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,carLineLat});',ctx);
vm.runInContext(`showToast=()=>{};activeTrackKey="${track}";initRace();logMsg=t=>{if(/${who}/.test(t))console.log("LOG",t)};`,ctx);
const g=ctx.__g;
for(let i=0;i<60*6000;i++){ctx.stepPhysics(1/60);const G=g(); const c=G.cars.find(x=>x.code===who);
 if(c.lap>4) break;
 if(c.lap>=3 && c.s>0.89 && c.s<0.956 && i%6===0){
  const nb=G.cars.filter(o=>o!==c&&!o.dnf&&Math.abs((o.totalDistM-c.totalDistM))<15).map(o=>o.code+"@"+(o.totalDistM-c.totalDistM).toFixed(0)+"/"+o.dLat.toFixed(1)).join(",");
  console.log(`L${c.lap} s${c.s.toFixed(4)} v${(c.speedMps*3.6).toFixed(0)} lat${c.dLat.toFixed(2)} pr${c.pitRequested?1:0} pc${c.pitCommitted?1:0} punct${c.puncture?1:0} limp${c.limpMax||0} esc${c.escapeT>0?1:0} def${c.defending?1:0} atk${c.attacking?1:0} rc${G.state.raceControl} nb[${nb}]`);}
}
