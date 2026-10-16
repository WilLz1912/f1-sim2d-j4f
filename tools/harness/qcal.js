// One car alone, qualifying conditions (out-lap then a flying lap on new Softs at Q1 grip),
// measure sectors on the real sector lines, the four speed points and each corner's minimum speed.
const fs=require("fs"),vm=require("vm");
const [path,track,code0,over]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M_=Object.create(Math);M_.random=mulberry32(7);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M_,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,CIRCUITS,PHYS,QUALI,timingPoints});',ctx);
const O=over?JSON.parse(over):{};
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";`,ctx);
for(const k in O) ctx.__g().PHYS[k]=O[k];
const who=code0||"RUS";
vm.runInContext(`initRace();
QUALI={trackKey:activeTrackKey,idx:0,res:{},alive:new Set(cars.map(c=>c.code)),setup:{},pen:{},elimQ1:[],elimQ2:[],grid:null,sets:{},tOut:110,clock:1e6,flagged:false,red:false};
for(const c of cars){QUALI.res[c.code]={Q1:null,Q2:null,Q3:null}} for(const k in TEAMS_2026) QUALI.setup[k]=0.97;
cars=[cars.find(c=>c.code==="${who}")]; const car=cars[0];
state.session="Q1"; state.raceControl="GREEN"; state.trackGripEvol=1.0; state.debrisList=[];
car.failMode=null; car.failAtM=1e15; car.reactionDelay=0; car.inPit=false; car.pitPhase="NONE"; car.compound="S"; car.wear=0; car.tyreTemp=95; car.ers=1.0;
car.qPushPlan=1; car.qPushLeft=0; car.qMode="OUT"; car.qLapStart=null; car.qLastCrossT=-1e9; car.qFuelKg=3+1.8*3; car.setupQ=0.97;
const L=CIRCUITS[activeTrackKey].lengthMeters, s0=0.74, sp=getSplinePt(s0);
car.s=s0; car.dLat=0; car.lap=5; car.totalDistM=4*L+s0*L; car.worldX=sp.x; car.worldY=sp.y; car.worldAngle=Math.atan2(sp.ty,sp.tx); car.speedMps=0;`,ctx);
const G=ctx.__g(); const cfg=G.CIRCUITS[track]; const TP=G.timingPoints(cfg); const L=cfg.lengthMeters;
const car=G.cars[0]; let prev=car.s, pushing=false, t0=0, marks={}, spd={}, prof=[];
for(let i=0;i<60*260;i++){ ctx.stepPhysics(1/60); const st=ctx.__g().state;
  if(car.qMode==="PUSH" && !pushing){pushing=true;t0=st.raceTime;}
  if(pushing){
    const t=st.raceTime-t0;
    for(const [k,x] of [["s1",TP.sec[0]],["s2",TP.sec[1]],["trap",TP.trap],["i1",TP.i1],["i2",TP.i2]]){
      const d=((car.s-prev)%1+1)%1, kk=((x-prev)%1+1)%1; if(d<0.2&&kk<d&&marks[k]===undefined){marks[k]=t; spd[k]=car.speedMps*3.6;}
    }
    prof.push([car.s,car.speedMps*3.6]);
    if(car.qMode!=="PUSH"){ marks.lap=t; spd.fl=car.speedMps*3.6; break; }
  }
  prev=car.s;
}
const lap=G.QUALI.res[who].Q1;
const S=[marks.s1, marks.s2-marks.s1, lap-marks.s2];
const mins=cfg.corners.map(c=>{const w=prof.filter(p=>Math.abs(((p[0]-c.s+1.5)%1)-0.5)<0.012); return c.num+":"+(w.length?Math.round(Math.min(...w.map(p=>p[1]))):"-");});
console.log(`${who} ${JSON.stringify(O)} LAP ${lap&&lap.toFixed(3)}  S1 ${S[0].toFixed(2)} S2 ${S[1].toFixed(2)} S3 ${S[2].toFixed(2)} | FL ${Math.round(spd.fl)} TRAP ${Math.round(spd.trap)} I1 ${Math.round(spd.i1)} I2 ${Math.round(spd.i2)}`);
console.log("  corner min km/h: "+mins.join(" "));
