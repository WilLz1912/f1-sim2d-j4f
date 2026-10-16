const fs=require("fs"),vm=require("vm");
const [path,track,seed,laps]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*updateHUD\(\);\s*requestAnimationFrame\(loop\);\s*$/m,"\n");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};let pnow=0;const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>pnow},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,SMART,orderCars,smartView});',ctx);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace();state.speedMult=1;state.camMode="smart";`,ctx);
const g=ctx.__g; const W=1600,H=900;
let prevOrder=null, passes=0, seen=0, seenTop10=0, passTop10=0, prevX=null, prevY=null, prevVx=0, prevVy=0, maxAcc=0, accSum=0, accN=0, pipOn=0, frames=0;
const shotLens=[]; let lastCut=null;
for(let i=0;i<60*6000;i++){ ctx.stepPhysics(1/60); pnow+=1000/60; const G=g();
 if(G.state.raceOver || G.state.leaderLap>+laps) break;
 if(Math.abs(g().state.raceTime-900)<0.01){ vm.runInContext('(()=>{const c=cars.find(x=>x.pos===8); retireCar(c, c.code+" hits the barrier at 120 km/h", {mobile:false, crash:true, impact:33}); })()',ctx); globalThis.FORCED=g().state.raceTime; } if(globalThis.FORCED && !globalThis.SCD && g().state.raceTime>globalThis.FORCED+4){ globalThis.SCD=1; vm.runInContext('deploySafetyCar("test")',ctx);} ctx.smartCamStep(1/60); { const R=G.SMART.rp; if(R && R!==globalThis.LASTRP){ globalThis.LASTRP=R; console.log(`RP t=${G.state.raceTime.toFixed(0)} L${G.state.leaderLap} rc=${G.state.raceControl} ${R.target} ${R.label} dur=${(R.t1-R.t0).toFixed(1)} frames=${R.frames.length}`);} }
 const m=G.SMART.main; const z=m.z;
 // screen-space motion of the picture (px/s) and its change (px/s^2)
 if(prevX!==null){ const vx=(m.x-prevX)*z*60, vy=(m.y-prevY)*z*60; const ax=(vx-prevVx)*60, ay=(vy-prevVy)*60; const a=Math.hypot(ax,ay); if(G.state.raceControl==="GREEN"){accSum+=a;accN++; if(a>maxAcc){maxAcc=a; globalThis.SPK={t:G.state.raceTime,rc:G.state.raceControl,shot:m.shot,key:m.shotKey,z:z.toFixed(2),off:Math.hypot(m.offX,m.offY).toFixed(1)};} if(a>8000) (globalThis.BIG=(globalThis.BIG||[])).push(G.state.raceTime.toFixed(1)+":"+m.shot+":"+m.shotKey);} prevVx=vx;prevVy=vy;}
 prevX=m.x;prevY=m.y; frames++; { const P=G.SMART.pip; if(G.SMART.pipAlpha>0.5 && P && P.shotKey && m.shotKey && m.shot==="battle" && P.shot==="battle"){ const A=m.shotKey.split(","); if(P.shotKey.split(",").some(x=>A.includes(x))) {globalThis.OVL=(globalThis.OVL||0)+1; if(globalThis.OVL<6) console.log("OVL t",G.state.raceTime.toFixed(1),"main",m.shotKey,"pip",P.shotKey,"alpha",G.SMART.pipAlpha.toFixed(2),"pipT",P.shotT.toFixed(2));} } } if(G.SMART.pipAlpha>0.5)pipOn++;
 // passes on screen
 const ord=G.orderCars().filter(c=>!c.dnf);
 const isRace=G.state.raceControl==="GREEN"&&G.state.leaderLap>1;
 if(prevOrder&&isRace){ for(let k=1;k<ord.length;k++){ const a=ord[k-1],b=ord[k]; const pk=prevOrder.indexOf(a.idx), pb=prevOrder.indexOf(b.idx);
   if(pk>pb && !a.inPit && !b.inPit && Math.abs(a.totalDistM-b.totalDistM)<30){ passes++; const v=G.smartView(W,H);
     const vis=c=>{const sx=(c.worldX-m.x)*z+W/2, sy=(c.worldY-m.y)*z+H/2; return sx>320&&sx<W-20&&sy>70&&sy<H-175;};
     const inPip=c=>G.SMART.pipAlpha>0.5 && G.SMART.pip && G.SMART.pip.shotKey && G.SMART.pip.shotKey.split(",").includes(String(c.idx));
     const ok=(vis(a)&&vis(b)); const okAny=ok||(inPip(a)&&inPip(b)); if(ok)seen++; if(k<=10){passTop10++; if(ok)seenTop10++;} if(okAny) G.__pipseen=(G.__pipseen||0)+1; } } }
 prevOrder=ord.map(c=>c.idx);
}
const G=g(); const log=G.SMART.lastLog.filter(e=>e.cam==="main");
const cuts=log.length; const tSpan=G.state.raceTime;
const lens=[]; for(let k=1;k<log.length;k++) lens.push(log[k].t-log[k-1].t);
lens.sort((a,b)=>a-b);
console.log(`race time ${tSpan.toFixed(0)}s, main cuts ${cuts} (${(cuts/(tSpan/60)).toFixed(1)}/min, last 200 kept), shot length p10/p50/min ${lens.length?lens[Math.floor(lens.length*0.1)].toFixed(1):'-'} / ${lens.length?lens[Math.floor(lens.length*0.5)].toFixed(1):'-'} / ${lens.length?lens[0].toFixed(1):'-'}s`);
console.log(`passes ${passes}, on main screen ${seen} (${(100*seen/Math.max(1,passes)).toFixed(0)}%), top-10 passes ${passTop10} on screen ${seenTop10} (${(100*seenTop10/Math.max(1,passTop10)).toFixed(0)}%)`);
console.log(`picture accel px/s^2 mean ${(accSum/Math.max(1,accN)).toFixed(0)} max ${maxAcc.toFixed(0)}; pip visible ${(100*pipOn/frames).toFixed(0)}% of frames`);
console.log("pip overlapping main frames",globalThis.OVL||0); console.log("spike",JSON.stringify(globalThis.SPK),"big",(globalThis.BIG||[]).length,(globalThis.BIG||[]).slice(0,12).join(" ")); console.log("shots:", log.slice(-25).map(e=>`${e.t.toFixed(0)}:${e.shot}${e.shot==="battle"?"["+e.key+"]":""}`).join(" "));
