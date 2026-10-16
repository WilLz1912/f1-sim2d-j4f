const fs=require("fs"),vm=require("vm");
let code=fs.readFileSync("v10.html","utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace("const kappa = clamp(kappaCmd, -kMax, kMax);","const kappa = clamp(kappaCmd, -kMax, kMax); c._dbg={want:desiredSpeedMps,plan:c._planV,cmdLat,front:front&&front.code,frontGap,rc:state.raceControl,surf:surf.kind,esc:c.escapeT,lat:c.dLat};");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`var __L=[];logMsg=t=>__L.push(state.raceTime.toFixed(1)+" "+t);showToast=()=>{};activeTrackKey="barcelona";initRace();`,ctx);
vm.runInContext(`while(state.raceTime<2775) stepPhysics(1/60);`,ctx);
console.log(vm.runInContext(`(()=>{const out=[];for(const c of cars){ if(c.dnf&&c.dnfCleaned) continue; if(c.s>0.66&&c.s<0.75) out.push(c.code+" s="+c.s.toFixed(4)+" v="+(c.speedMps*3.6).toFixed(1)+" dnf="+c.dnf+" inPit="+c.inPit+" dbg="+JSON.stringify(c._dbg)+" nb="+c._nb.filter(n=>Math.abs(n.gapM)<30).map(n=>n.o.code+":"+n.gapM.toFixed(1)+"/"+n.latRel.toFixed(1)+(n.o.dnf?"D":"")).join(","));} return out.join("\\n");})()`,ctx));
console.log(vm.runInContext("__L.filter(t=>/DNF|cleared|stopped/.test(t)).slice(-12).join('\\n')",ctx));
