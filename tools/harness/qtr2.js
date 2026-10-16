const fs=require("fs"),vm=require("vm");
const [path,track,seed,who,t0,t1]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI,trackPts:typeof trackPts!=="undefined"?trackPts:null});',ctx);
const L=[]; ctx.__L=t=>L.push(t); vm.runInContext(`showToast=()=>{};logMsg=t=>__L(t);activeTrackKey="${track}";startWeekend(true);`,ctx);
const g=ctx.__g; let k=0;
for(let i=0;i<60*4000;i++){ctx.stepPhysics(1/60);const G=g(); const t=G.state.raceTime; if(t>+t1)break;
 if(t>=+t0 && (k++%15===0)){ const cc=G.cars.find(x=>x.code===who); if(cc.qMode!=="PUSH") continue; const c=G.cars.find(x=>x.code===who); const f=G.cars.filter(o=>o!==c&&!o.inPit&&!o.dnf).map(o=>({o,d:((o.s-c.s+1)%1)})).sort((a,b)=>a.d-b.d)[0];
  const o=f.o; console.log(`t=${t.toFixed(1)} ${who} ${c.qMode} s=${c.s.toFixed(4)} v=${c.speedMps.toFixed(1)} lat=${c.dLat.toFixed(1)} att=${c.attacking?1:0} imp=${(c.qImpeded||0).toFixed(1)} | ${o.code} ${o.qMode} gap=${(f.d*4657).toFixed(0)}m v=${o.speedMps.toFixed(1)} lat=${o.dLat.toFixed(1)} yOk=${o.qYieldOk} y=${o.qYielding} roll=${o.qYieldRoll===c.idx} k=${(G.trackPts?0:0)}`);}
}
