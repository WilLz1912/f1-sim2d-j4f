const fs=require("fs"),vm=require("vm");
const [path,track,seed,tA,tB,codeA,codeB]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const M=Object.create(Math);M.random=mulberry32(+seed);
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math:M,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,RACE_HALF,HALF_TRACK,CAR_WIDTH,physCarLenU,unitToMeter});',ctx);
vm.runInContext(`logMsg=t=>{if(state.raceTime>${tA}-1)console.log("LOG",state.raceTime.toFixed(2),t)};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const g=ctx.__g; console.log("RACE_HALF",g().RACE_HALF,"HALF",g().HALF_TRACK,"W",g().CAR_WIDTH,"len",(g().physCarLenU*g().unitToMeter).toFixed(2));
for(let i=0;;i++){ctx.stepPhysics(1/60);const st=g().state;if(st.raceTime>+tB)break;if(st.raceTime<+tA)continue;
 if(i%3)continue;
 const f=c=>`${c.code} s=${c.s.toFixed(4)} lat=${c.dLat.toFixed(2)} cmd=${(c.offsetCmd).toFixed(2)} v=${(c.speedMps*3.6).toFixed(0)} brk=${c.brake.toFixed(2)} thr=${c.throttle.toFixed(2)} esc=${c.escapeT.toFixed(2)}/${c.escapeSide} atk=${c.attacking?1:0} def=${c.defending?1:0} off=${c.offTrack?1:0} gb=${c.giveBackPosTo?c.giveBackPosTo.code:"-"} hd=${(c.worldAngle*57.3).toFixed(0)}`;
 const A=g().cars.find(c=>c.code===codeA),B=g().cars.find(c=>c.code===codeB);
 console.log(st.raceTime.toFixed(2),"|",f(A),"|",f(B),"| gap",(A.totalDistM-B.totalDistM).toFixed(1));}
