const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3];
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace("  const driverWearFactor = 1.92","  c._wd={slip:c.slipRatio,temp:c.tyreTemp,opt:tSpec.optTemp[1],push:c.pushIntensity,syn:syn.wearPenalty};\n  const driverWearFactor = 1.92");
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
console.log(vm.runInContext(`(()=>{logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();
 const c=cars.find(x=>x.code==="RUS"); cars=[c]; c.idx=0; c.failMode=null; c.compound="M"; state.raceControl="GREEN"; c.reactionDelay=0;
 let lap=c.lap, w0=0, out=[], tsum=0,tn=0,slip=0,hot=0,n=0;
 for(let i=0;i<60*600;i++){ stepPhysics(1/60); if(c._wd){ tsum+=c._wd.temp; slip+=c._wd.slip; if(c._wd.temp>c._wd.opt) hot++; n++; }
   if(c.lap>lap){ out.push("L"+lap+" wear+"+(c.wear-w0).toFixed(3)+" avgTemp"+(tsum/n).toFixed(0)+" hot%"+(100*hot/n).toFixed(0)+" slip"+(slip/n).toFixed(3)); w0=c.wear; lap=c.lap; tsum=0;slip=0;hot=0;n=0; if(lap>5) break; } }
 return "${track} medium: "+out.join(" | ")+" | optTemp "+TYRE_SPECS.M.optTemp.join("-");})()`,ctx));
