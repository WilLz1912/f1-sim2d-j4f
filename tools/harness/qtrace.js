const fs=require("fs"),vm=require("vm");
const [path,track,seed,who,sess,clockFrom,clockTo]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace("  // ---------------- G. Lane choice (target lateral position) ----------------","  c._w1 = desiredSpeedMps;\n  // ---------------- G. Lane choice (target lateral position) ----------------");
code=code.replace("  // ---------------- I. Power unit: ICE + MGU-K and a real energy store (2026 rules) ----------------","  c._w3 = desiredSpeedMps;\n  // ---------------- I. Power unit: ICE + MGU-K and a real energy store (2026 rules) ----------------");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI});',ctx);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";startWeekend();`,ctx);
const g=ctx.__g;
for(let i=0;i<60*4000;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.session==="QEND")break;
 if(G.state.session!==sess) continue; const clk=G.QUALI.clock; if(clk>+clockFrom||clk<+clockTo) continue; if(i%30) continue;
 const c=G.cars.find(x=>x.code===who); const nb=(c._nb||[]).filter(n=>n.gapM>0&&n.gapM<120).sort((a,b)=>a.gapM-b.gapM)[0];
 const o=nb&&nb.o;
 console.log(`clk${clk.toFixed(0)} ${who} ${c.qMode}${c.inPit?"(pit "+c.pitPhase+")":""} s${c.s.toFixed(3)} v${(c.speedMps*3.6).toFixed(0)} want${((c._w1||0)*3.6).toFixed(0)}/${((c._w3||0)*3.6).toFixed(0)} atk${c.attacking?1:0} ers${c.ers.toFixed(2)} T${c.tyreTemp.toFixed(0)} | ahead ${o?o.code+" "+o.qMode+(o.qYielding?" yld":"")+" gap"+nb.gapM.toFixed(0)+" v"+(o.speedMps*3.6).toFixed(0)+" lat"+nb.latRel.toFixed(1):"-"}`);}
