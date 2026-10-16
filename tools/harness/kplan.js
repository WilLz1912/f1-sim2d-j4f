const fs=require("fs"),vm=require("vm");
let code=fs.readFileSync(process.argv[2],"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(`activeTrackKey="${process.argv[3]}";buildSpline("${process.argv[3]}");`,ctx);
const a=+process.argv[4], b=+process.argv[5];
for(let s=a;s<=b;s+=0.002) console.log(s.toFixed(3), vm.runInContext(`(()=>{const p=getSplinePt(${s});return "R="+(1/Math.max(1e-5,p.kPlan||0)).toFixed(0)+"m vc="+(cornerSpeedFor(0.95,p.kPlan)*3.6).toFixed(0)+" ideal="+p.idealLat.toFixed(1);})()`,ctx));
