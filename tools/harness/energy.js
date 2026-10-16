// Solo car: per-lap time, SOC trace, top speed, time in clip/super-clip
const fs=require("fs"),vm=require("vm");
const path=process.argv[2], track=process.argv[3], code3=process.argv[4]||"MER", laps=+process.argv[5]||4;
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
console.log(vm.runInContext(`(()=>{logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();
 const c=cars.find(x=>x.team.code3==="${code3}"); cars=[c]; c.idx=0; c.failMode=null; state.raceControl="GREEN"; state.momEnabled=true; c.reactionDelay=0;
 let out=[], lap=c.lap, t0=0, vmax=0, clip=0, sclip=0, minSoc=1, socs=[], lh=0, dep=0, prevE=c.ers;
 for(let i=0;i<60*120*${laps};i++){ stepPhysics(1/60); vmax=Math.max(vmax,c.speedMps*3.6); if(c.aeroMode==="CLIP")clip+=1/60; if(c.aeroMode==="S-CLIP")sclip+=1/60; minSoc=Math.min(minSoc,c.ers); lh=Math.max(lh,c.lapHarvest); if(c.mguKPowerKw>0) dep+=c.mguKPowerKw*c.throttle/60/1000; if(i%600===0) socs.push(c.ers.toFixed(2));
   if(c.lap>lap){ out.push("L"+lap+" "+(state.raceTime-t0).toFixed(2)+"s vmax"+vmax.toFixed(0)+" clip"+clip.toFixed(1)+"s sclip"+sclip.toFixed(1)+"s minSOC"+minSoc.toFixed(2)+" harvest"+lh.toFixed(1)+"MJ deploy"+dep.toFixed(1)+"MJ"); lh=0; dep=0; lap=c.lap; t0=state.raceTime; vmax=0; clip=0; sclip=0; minSoc=1; if(lap>${laps}) break; } }
 return "${code3} @ ${track}: "+out.join(" | ")+"\\n  SOC every 10s: "+socs.join(" ");})()`,ctx));
