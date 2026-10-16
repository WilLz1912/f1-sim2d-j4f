const fs=require("fs"),vm=require("vm");
const [path,track,seed]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const rep=(a,b)=>{ if(!code.includes(a)) {console.log("PATCH MISS",a.slice(0,50)); } code=code.replace(a,b); };
rep("    c.qPushLeft--;","    logMsg(`LAP ${key} ${c.code} ${fmtLap(lt)} imp=${(c.qImpeded||0).toFixed(1)} traf=${(c.qTraf||0).toFixed(1)}/${c.qTrafBy||''} S${(c.qTrS||0).toFixed(0)}C${(c.qTrC||0).toFixed(0)}Y${(c.qTrY||0).toFixed(0)}P${(c.qTrP||0).toFixed(0)} by=${c.qImpBy||''} ersEnd=${c.ers.toFixed(2)} tT=${(c.tyreTemp||0).toFixed(0)} left=${c.qPushLeft}`);\n    c.qPushLeft--;");
rep('c.qMode = "PUSH"; c.qLapStart = now;','c.qTraf=0; c.qTrafBy=""; c.qTrS=0;c.qTrC=0;c.qTrY=0;c.qTrP=0; logMsg(`START ${key} ${c.code} t=${state.raceTime.toFixed(0)} ers=${c.ers.toFixed(2)} tT=${(c.tyreTemp||0).toFixed(0)}`); c.qMode = "PUSH"; c.qLapStart = now;');
rep("  if (isQuali() && !c.inPit) {\n    const qm = c.qMode;","  if (isQuali() && !c.inPit) {\n    const qm = c.qMode; if (qm===\"PUSH\" && frontOnTrack && frontGap < 40) { c.qTraf=(c.qTraf||0)+dt; c.qTrafBy=frontOnTrack.code+':'+frontOnTrack.qMode; if((pt.kPlan||0)<0.006) c.qTrS=(c.qTrS||0)+dt; else c.qTrC=(c.qTrC||0)+dt; if(frontOnTrack.qYielding) c.qTrY=(c.qTrY||0)+dt; if(frontOnTrack.qMode==\"PUSH\") c.qTrP=(c.qTrP||0)+dt; }");
rep("c.qImpeded = (c.qImpeded || 0) + dt;","c.qImpeded = (c.qImpeded || 0) + dt; c.qImpBy = frontOnTrack.code+':'+frontOnTrack.qMode+(frontOnTrack.qYieldOk?'y':'n')+(frontOnTrack.inPit?'P':'');");
rep("  if (closing < 2.5) return; // a kiss","  if (closing >= 2.5) logMsg(`CONTACT ${A.code}:${A.qMode}${A.inPit?'P':''}${A.qYielding?'y':''}${A.attacking?'a':''} v=${A.speedMps.toFixed(0)} lat=${A.dLat.toFixed(1)} / ${B.code}:${B.qMode}${B.inPit?'P':''}${B.qYielding?'y':''}${B.attacking?'a':''} v=${B.speedMps.toFixed(0)} lat=${B.dLat.toFixed(1)} s=${A.s.toFixed(3)} k=${(getSplinePt(A.s).kPlan||0).toFixed(4)} cl=${closing.toFixed(1)} Aok=${A.qYieldOk}/${A.qYieldRoll===B.idx} Bok=${B.qYieldOk}/${B.qYieldRoll===A.idx} gap=${(wrapDs(B.s-A.s)*L).toFixed(1)}`);\n  if (closing < 2.5) return; // a kiss");
rep("      c.qLapStart = null; c.qAborts = (c.qAborts || 0) + 1;","      logMsg(`ABORT ${state.session} ${c.code} s=${c.s.toFixed(2)} late=${(state.raceTime - c.qLapStart - expectNow).toFixed(1)} valid=${c.qLapValid} traf=${(c.qTraf||0).toFixed(0)}/${c.qTrafBy} n=${(c.qAborts||0)+1}`); c.qLapStart = null; c.qAborts = (c.qAborts || 0) + 1;");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(+seed||1);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,QUALI,fmtLap});',ctx);
const L=[]; ctx.__L=t=>L.push(t); vm.runInContext(`showToast=()=>{};logMsg=t=>__L(t);activeTrackKey="${track}";startWeekend(true);`,ctx);
const g=ctx.__g; let lastSess="";
for(let i=0;i<60*4000;i++){ctx.stepPhysics(1/60);const G=g(); if(G.state.session!==lastSess){lastSess=G.state.session; L.push("SESSION "+lastSess);} if(G.state.session==="QEND")break;}
const G=g(); const Q=G.QUALI;
fs.writeFileSync(`qdiag_${track}_${seed}.txt`,L.join("\n"));
console.log("ORDER:",Q.order&&Q.order.map((c,i)=>`${i+1}.${c} ${G.fmtLap(Q.res[c].Q3||Q.res[c].Q2||Q.res[c].Q1)}`).join("  "));
console.log("pens:",JSON.stringify(Q.pen));
