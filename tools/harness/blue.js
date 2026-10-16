const fs=require("fs"),vm=require("vm");
const [path,track,seed,secs]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,spline,CIRCUITS});',ctx);
const pens=[];
vm.runInContext(`showToast=()=>{};activeTrackKey="${track}";initRace();logMsg=t=>{if(/blue/i.test(t))__P(t)};`,ctx);
ctx.__P=t=>pens.push(t);
const g=ctx.__g; const L=g().CIRCUITS[track].lengthMeters; const open={}, done=[];
for(let i=0;i<60*+secs;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.raceOver)break; if(G.state.raceControl!=="GREEN"){for(const k in open) delete open[k]; continue;}
 for(const c of G.cars){ if(c.dnf||c.inPit) continue;
  const key=c.idx;
  if(c.blueFlag && c.blueLapper && !open[key]) open[key]={c,lp:c.blueLapper,t0:G.state.raceTime,yieldT:null};
  const e=open[key]; if(!e) continue;
  if(c.blueYield && e.yieldT===null) e.yieldT=G.state.raceTime;
  // finished when the lapper is physically ahead
  const d=(((e.lp.s-c.s)%1)+1)%1*L;
  if(d>2 && d<L/2 && !e.lp.inPit){ const k=Math.floor(c.s*G.spline.length)%G.spline.length; done.push({cs:c.s,ls:e.lp.s,cd:c.totalDistM,ld:e.lp.totalDistM,who:c.code,lap:e.lp.code,dur:G.state.raceTime-e.t0,yielded:e.yieldT!==null,inCorner:(G.spline[k].kPlan||0)>0.006}); delete open[key]; }
  else if(G.state.raceTime-e.t0>120 || e.lp.inPit || e.lp.dnf){ delete open[key]; }
 }}
const n=done.length, dur=done.map(x=>x.dur).sort((a,b)=>a-b), q=p=>dur.length?dur[Math.floor(p*(dur.length-1))].toFixed(1):"-";
console.log(`Số lần bắt vòng: ${n} | thời gian kẹt sau xe bị bắt vòng (s) p10/p50/p90/max: ${q(.1)}/${q(.5)}/${q(.9)}/${q(1)} | xe bị bắt vòng chủ động nhường: ${done.filter(x=>x.yielded).length} | xe đi bắt vòng tự vượt trước khi được nhường: ${done.filter(x=>!x.yielded).length} | vượt trong góc cua: ${done.filter(x=>x.inCorner).length}`);
console.log("Phạt cờ xanh:", pens.length? pens.join(" | ") : "không");
console.log("dur0:",done.filter(x=>x.dur<0.05).slice(0,6).map(x=>`${x.lap}->${x.who} s ${x.ls.toFixed(4)} vs ${x.cs.toFixed(4)} dist ${x.ld.toFixed(0)} vs ${x.cd.toFixed(0)}`).join(" | "));
console.log("Ví dụ:", done.slice(0,12).map(x=>`${x.lap} bắt vòng ${x.who} sau ${x.dur.toFixed(1)}s${x.yielded?" (được nhường)":" (tự vượt)"}`).join("; "));
