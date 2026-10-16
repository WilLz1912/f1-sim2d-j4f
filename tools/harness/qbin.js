const fs=require("fs"),vm=require("vm");
const [path,track,seed,who]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI});',ctx);
const L=[];ctx.__L=t=>L.push(t);
vm.runInContext(`showToast=()=>{};logMsg=t=>__L(t);activeTrackKey="${track}";startWeekend();`,ctx);
const g=ctx.__g; let prev="",n=0;
for(let i=0;i<60*400;i++){ctx.stepPhysics(1/60);const G=g();
 const c=G.cars.find(x=>x.code===who);
 if(c.qMode==="PUSH"){ if(prev!=="PUSH") n++; if(n===1 && i%20===0) console.log(`t=${G.state.raceTime.toFixed(1)} s=${c.s.toFixed(3)} v=${c.speedMps.toFixed(1)} rc=${G.state.raceControl} ys=${(G.state.yellowSectorS||0).toFixed(3)} dLat=${c.dLat.toFixed(1)} line=${c.lineNow} thr=${(c.throttle||0).toFixed(2)} brk=${(c.brake||0).toFixed(2)} esc=${(c.escapeT||0).toFixed(1)}`);}
 if(n===1&&c.qMode!=="PUSH"&&prev==="PUSH")break;
 prev=c.qMode;}
console.log(L.filter(t=>!/released|peels/.test(t)).slice(0,20).join("\n"));
