const fs=require("fs"),vm=require("vm");
const [path,track,laps]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({state,cars});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";CIRCUITS["${track}"].totalLaps=${laps};initRace();`,ctx);
const g=ctx.__g; let tFlag=null,tClass=null;
for(let i=0;i<60*3000;i++){ctx.stepPhysics(1/60);const st=g().state; if(st.leaderFinished&&tFlag===null)tFlag=st.raceTime; if(st.classified&&tClass===null)tClass=st.raceTime; if(st.raceOver)break;}
const st=g().state;
console.log("flag",tFlag&&tFlag.toFixed(0),"classified",tClass&&tClass.toFixed(0),"session over",st.raceTime.toFixed(0),"raceOver",st.raceOver,"parked",g().cars.filter(c=>c.parked).length,"/",g().cars.filter(c=>!c.dnf).length);
const html=els["resultsPanel"]?els["resultsPanel"].innerHTML:"(none)";
console.log(html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,900));
