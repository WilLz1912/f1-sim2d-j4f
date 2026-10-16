const fs=require("fs"),vm=require("vm");
const [path,track]=process.argv.slice(2);
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.replace(/\nstartWeekend\(\);\s*$/m,"\n");
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({spline,CIRCUITS,HALF_TRACK,ZN,unitToMeter});',ctx);
vm.runInContext(`showToast=()=>{};logMsg=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const G=ctx.__g(); const sp=G.spline, M=sp.length, cfg=G.CIRCUITS[track];
// for every station and side: free distance along the normal until within HALF_TRACK+2 of a non-local part of the track
function free(k,sd){const p=sp[k];for(let d=G.HALF_TRACK;d<80;d+=0.5){const x=p.x+p.nx*sd*d,y=p.y+p.ny*sd*d;
 for(let j=0;j<M;j+=2){const dk=Math.min(Math.abs(j-k),M-Math.abs(j-k)); if(dk<M*0.03) continue; const q=sp[j]; if(Math.hypot(q.x-x,q.y-y)<G.HALF_TRACK+3) return d-G.HALF_TRACK;}}
 return 80-G.HALF_TRACK;}
for(const c of cfg.corners){const k=c.kIdx;const out=sp[k].curv>=0?-1:1;
 console.log(c.num,"s",(k/M).toFixed(3),"outSide",out,"zoneDepth",G.ZN.depth[out>0?1:0][k].toFixed(1),"freeOut",free(k,out).toFixed(1),"freeIn",free(k,-out).toFixed(1),"(units; 1u=",G.unitToMeter.toFixed(3),"m)");}
