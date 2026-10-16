const fs=require("fs"),vm=require("vm");
const [path,track,t]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars,spline,CORNERS,LINES,CORNER_OF,carLineLat});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();cars=[cars.find(c=>c.code==="VER")];cars[0].idx=0;state.raceControl="GREEN";cars[0].reactionDelay=0;cars[0].lineSel=new Int8Array(CORNERS.length).fill(${t});`,ctx);
const g=ctx.__g();const M=g.spline.length;
for(let i=0;i<60*200;i++){ctx.stepPhysics(1/60);const c=g.cars[0]; if(c.lap===2&&(c.s>0.97||c.s<0.03)&&i%6===0){const k=Math.floor(c.s*M);console.log(`s=${c.s.toFixed(4)} corner=${g.CORNER_OF[k]} lat=${c.dLat.toFixed(2)} myLine=${g.carLineLat(c,c.s).toFixed(2)} STD=${g.LINES[0].lat[k].toFixed(2)} ALT=${g.LINES[+t].lat[k].toFixed(2)} v=${(c.speedMps*3.6).toFixed(0)}`);} if(c.lap>2)break;}
