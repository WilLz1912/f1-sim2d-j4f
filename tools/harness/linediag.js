const fs=require("fs"),vm=require("vm");
const path=process.argv[2];
let code=fs.readFileSync(path,"utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const fe=()=>({textContent:"",innerHTML:"",value:"",className:"",dataset:{},style:{},children:[0,1,2,3,4,5,6].map(()=>({style:{},dataset:{}})),classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},prepend(){},removeChild(){},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}}),set:()=>true})}});
for(const track of ["barcelona","imola","monza"]){
const els={};const ctx={Math,console,document:{getElementById:i=>els[i]||(els[i]=fe()),createElement:fe,querySelectorAll:()=>[]},window:{innerWidth:1600,innerHeight:900,addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},Set,Float64Array};
vm.createContext(ctx);vm.runInContext(code+'\n;globalThis.__g=()=>({spline,state,CIRCUITS});',ctx);
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";initRace();`,ctx);
const {spline,state,CIRCUITS}=ctx.__g(); const M=spline.length, ds=CIRCUITS[track].lengthMeters/M;
const lat=spline.map(p=>p.idealLat);
// high-pass residual: lat minus 9-station moving average
const hp=lat.map((_,k)=>{let s=0;for(let j=-4;j<=4;j++)s+=lat[(k+j+M)%M];return lat[k]-s/9;});
const rms=Math.sqrt(hp.reduce((a,b)=>a+b*b,0)/M), mx=Math.max(...hp.map(Math.abs));
// autocorrelation of residual for lags 1..12
const ac=[];for(let L=1;L<=12;L++){let s=0;for(let k=0;k<M;k++)s+=hp[k]*hp[(k+L)%M];ac.push((s/M/(rms*rms)).toFixed(2));}
// zigzag on straights: where |kLine| small
const st=[];for(let k=0;k<M;k++) if(Math.abs(spline[k].kLine)<0.002) st.push(Math.abs(hp[k]));
console.log(track,`M=${M} ds=${ds.toFixed(2)}m  wiggle rms=${rms.toFixed(3)}m max=${mx.toFixed(2)}m  on straights mean=${(st.reduce((a,b)=>a+b,0)/st.length).toFixed(3)}m  autocorr lag1..12: ${ac.join(" ")}  lapEst=${state.idealLapEstimate.toFixed(2)}`);
}
