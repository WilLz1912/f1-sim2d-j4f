const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3], seed=+process.argv[4], tmax=+process.argv[5]||4000;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace("function retireCar(c, reason, opts) {","function retireCar(c, reason, opts) {\n  if (/barrier/.test(reason)) __crash(c, reason);");
// keep a short history per car
code=code.replace("function stepCarOnTrack(c, dt, cfg, running) {","function stepCarOnTrack(c, dt, cfg, running) {\n  (c._h = c._h || []).push([state.raceTime.toFixed(2), c.s.toFixed(4), (c.speedMps*3.6).toFixed(0), c.dLat.toFixed(1), (c._planV*3.6||0).toFixed(0), c.brake.toFixed(2), c.throttle.toFixed(2), c.escapeT>0?'E'+c.escapeSide:'', c.mistakeT>0?'M':'', c.attacking?'A':'', c.wear.toFixed(2), c.aeroMode]); if (c._h.length > 40) c._h.shift();");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
let n=0;
ctx.__crash=(c,reason)=>{ if(n++>=2) return; console.log("=== "+reason+" lap "+c.lap); c._h.filter((x,i)=>i%3===0||i>c._h.length-6).forEach(h=>console.log("  t="+h[0]+" s="+h[1]+" v="+h[2]+" lat="+h[3]+" plan="+h[4]+" brk="+h[5]+" thr="+h[6]+" "+h[7]+h[8]+h[9]+" wear="+h[10]+" "+h[11])); };
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();for(let i=0;i<60*${tmax};i++){stepPhysics(1/60); if(state.raceOver)break;}`,ctx);
