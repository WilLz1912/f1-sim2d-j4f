const fs=require("fs"),vm=require("vm");
const code=fs.readFileSync("v8.js","utf8");
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
for(const t of ["barcelona","imola","monza"]){
 console.log(vm.runInContext(`activeTrackKey="${t}";buildSpline("${t}");(()=>{const cfg=CIRCUITS["${t}"],pg=pitComplexGeom,u=unitToMeter;
 const e=getSplinePt(cfg.pitEntryS);const ex=getSplinePt(cfg.pitExitS);
 const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])*u;
 const entry=d([pg.entryX,pg.entryY],pg.fastStart), fast=d(pg.fastStart,pg.fastEnd), exit=d(pg.fastEnd,[pg.exitX,pg.exitY]);
 const trackEq=((cfg.pitExitS-cfg.pitEntryS+1)%1)*cfg.lengthMeters;
 return "${t}: unitToMeter="+u.toFixed(2)+" | ramp vào thật="+entry.toFixed(0)+"m (code 72m) | fast lane thật="+fast.toFixed(0)+"m (code 340m) | ramp ra thật="+exit.toFixed(0)+"m (code 68m) | đoạn đường đua tương đương="+trackEq.toFixed(0)+"m";})()`,ctx));
}
