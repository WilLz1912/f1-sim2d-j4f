// Full-race harness for the V9 core
const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3]||"barcelona", seed=+process.argv[4]||1, out=process.argv[5], lapsOverride=+process.argv[6]||0;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`var __L=[];logMsg=t=>__L.push({t:state.raceTime,lap:state.leaderLap,txt:t});showToast=()=>{};activeTrackKey="${track}";if(${lapsOverride})CIRCUITS["${track}"].totalLaps=${lapsOverride};initRace();`,ctx);
const t0=Date.now();
vm.runInContext(`var __PL=[]; var __ot={n:0,list:[],sign:{},pitT:{},close:0,closeN:0}; var __lt={}; var __lastLap={};
for(let i=0;i<60*12000;i++){ stepPhysics(1/60); if(state.raceOver) break;
  for(const c of cars){ if(c.pitRequested&&!c.__pr){const p=c.plan||{};__PL.push(\`L\${c.lap} \${c.code} P\${c.pos} rc=\${state.raceControl} \${c.compound} wear=\${c.wear.toFixed(2)} cliff=\${TYRE_SPECS[c.compound].cliff} wing=\${(c.wingDamage||0).toFixed(2)} flat=\${(c.flatspot||0).toFixed(2)} punct=\${c.puncture} plan=\${p.stops}@\${p.stopLap}->\${p.nextComp} traffic=\${(c.pitTraffic||0).toFixed(1)} mgmt=\${(c.tyreMgmt||0).toFixed(2)}\`);} c.__pr=c.pitRequested; }
  for(const c of cars){ if(__lastLap[c.idx]===undefined){__lastLap[c.idx]={lap:c.lap,t:state.raceTime,clean:true};}
    const ll=__lastLap[c.idx]; if(c.inPit||state.raceControl!=="GREEN") ll.clean=false; if(c.dirtyAir>0.3) ll.dirty=(ll.dirty||0)+1/60;
    if(c.lap>ll.lap){ if(ll.clean&&ll.lap>=3&&!c.dnf){(__lt[c.code]=__lt[c.code]||[]).push([state.raceTime-ll.t,(ll.dirty||0)]);} __lastLap[c.idx]={lap:c.lap,t:state.raceTime,clean:true}; } } if(i%(60*600)===0) console.error("simT",state.raceTime.toFixed(0),"lap",state.leaderLap);
  if(i%15===0 && state.raceControl==="GREEN"){
    const run=cars.filter(c=>!c.dnf&&!c.finished);
    for(const c of run){ if(c.inPit) __ot.pitT[c.idx]=state.raceTime; }
    for(let a=0;a<run.length;a++)for(let b=a+1;b<run.length;b++){const A=run[a],B=run[b];const k=A.idx+"-"+B.idx;const d=A.totalDistM-B.totalDistM;
      if(Math.abs(d)>80||A.inPit||B.inPit){delete __ot.sign[k];continue;}
      const sg=Math.sign(d); const recentPit=(state.raceTime-(__ot.pitT[A.idx]||-99)<25)||(state.raceTime-(__ot.pitT[B.idx]||-99)<25);
      // confirmed pass: the new order must hold for 4 s (side-by-side jitter is not a pass)
      const st=__ot.sign[k];
      if(st===undefined){__ot.sign[k]={s:sg,cand:0,t:0};continue;}
      if(sg!==st.s){ if(st.cand!==sg){st.cand=sg;st.t=state.raceTime;} else if(state.raceTime-st.t>=4){ if(!recentPit&&state.leaderLap>1){__ot.n++; if(__ot.list.length<400)__ot.list.push(state.leaderLap);} st.s=sg; st.cand=0; } }
      else st.cand=0;}
    if(i%300===0){ for(const c of run){ if(c.pos>1&&c.interval<1.0) __ot.close++; __ot.closeN++; } }
  }
}`,ctx);
const R=vm.runInContext(`({t:state.raceTime,over:state.raceOver,lap:state.leaderLap,L:__L,pens:state.penaltyCount,
  lt:__lt, ot:__ot.n, otLaps:__ot.list, closePct:__ot.closeN?__ot.close/__ot.closeN:0, cls:orderCars().map(c=>({code:c.code,fin:c.finished,laps:c.lapsDone,pen:c.penaltySec,stops:c.pitStops,dnf:c.dnf,why:c.retireReason,gap:c.finalGapTxt,tyres:[...c.usedCompounds].join("")}))})`,ctx);
if(out) fs.writeFileSync(out,JSON.stringify(R));
const L=R.L.map(x=>x.txt), cnt=re=>L.filter(t=>re.test(t)).length, lapsOf=re=>R.L.filter(x=>re.test(x.txt)).map(x=>x.lap).join(",");
console.log(`${track} seed=${seed} wall=${((Date.now()-t0)/1000).toFixed(0)}s simT=${R.t.toFixed(0)}s over=${R.over} lap=${R.lap}`);
console.log(`SC: ${cnt(/Safety Car exits/)} [laps ${lapsOf(/Safety Car exits/)}] | VSC: ${cnt(/VSC deployed/)} [${lapsOf(/VSC deployed/)}] | RED: ${cnt(/slowing field/)}`);
console.log(`Penalties: ${R.pens} [laps ${lapsOf(/STEWARDS: \+/)}] | investigations: ${cnt(/Stewards: incident/)} | contacts(light/wing): ${cnt(/Light contact/)}/${cnt(/makes contact/)} | punctures: ${cnt(/puncture/)}`);
console.log(`DNF: ${R.cls.filter(c=>c.dnf).map(c=>c.code+"("+c.why.replace(c.code+" ","")+")").join("; ")}`);
console.log(`Stops: ${R.cls.filter(c=>!c.dnf).map(c=>c.code+":"+c.stops+c.tyres).join(" ")}`);
console.log(`Top: ${R.cls.slice(0,10).map((c,i)=>(i+1)+"."+c.code+(c.pen?"(+"+c.pen+")":"")+" "+(c.gap||"")).join(" | ")}`);
console.log(`OVERTAKES (green, same lap, not pit-related): ${R.ot} | cars within 1s of car ahead: ${(R.closePct*100).toFixed(0)}% of the time`);
{const rows=Object.entries(R.lt).map(([k,a])=>{const s=a.map(x=>x[0]).sort((p,q)=>p-q);const med=s[Math.floor(s.length/2)];const d=a.reduce((p,x)=>p+x[1],0)/a.length;return [k,med,d,a.length];}).sort((p,q)=>p[1]-q[1]);
 console.log("Median clean green lap (s) [avg sec/lap in dirty air]: "+rows.map(r=>r[0]+" "+r[1].toFixed(2)+"["+r[2].toFixed(0)+"]").join(" | "));}
console.log(`Pit speeding: ${cnt(/Speeding in the pit/)} unsafe: ${cnt(/Unsafe release/)} giveBack: ${cnt(/give it back/)} handsBack: ${cnt(/hands the position back/)} missedPit: ${cnt(/misses the pit/)} beached: ${cnt(/beached/)} spins: ${cnt(/spins/)}`);

;require("fs").writeFileSync(out.replace(".json","_pits.txt"), vm.runInContext("__PL.join(\"\\n\")",ctx));
