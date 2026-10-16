const fs=require("fs"),vm=require("vm");
const [path,track,seed]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>Date.now()},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI});',ctx);
const L=[];ctx.__L=t=>L.push(t);
vm.runInContext(`showToast=()=>{};logMsg=t=>__L(t);activeTrackKey="${track}";startWeekend(true);`,ctx);
const g=ctx.__g;
for(let i=0;i<60*4000;i++){ctx.stepPhysics(1/60); if(g().state.session==="QEND")break;}
const Q=g().QUALI; const pole=Q.res[Q.order[0]].Q3;
console.log("pole",Q.order[0],pole.toFixed(3),"grid",Q.grid.slice(0,10).join(" "),"setup",JSON.stringify(Object.fromEntries(Object.entries(Q.setup).map(([k,v])=>[k,+v.toFixed(3)]))));
vm.runInContext("startRaceFromQuali()",ctx);
const G0=g(); console.log("race grid",G0.cars.slice(0,10).map(c=>c.code).join(" "),"setupQ",G0.cars.slice(0,3).map(c=>c.code+":"+(c.setupQ||0).toFixed(3)).join(" "), "session",G0.state.session);
for(let i=0;i<60*8000;i++){ctx.stepPhysics(1/60); const st=g().state; if(st.raceOver||st.classified&&i%600===0&&st.raceOver)break;}
const st=g().state; console.log("race over",!!st.raceOver,"FL",JSON.stringify(st.fastestLap),"delta pole-FL", st.fastestLap? (st.fastestLap.time-pole).toFixed(2):"-");
console.log("SC/VSC", L.filter(t=>/SAFETY CAR DEPLOYED|VIRTUAL SAFETY/.test(t)).length, "DNF", L.filter(t=>/DNF/.test(t)).length);
