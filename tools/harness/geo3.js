const fs=require("fs"),vm=require("vm");
let code=fs.readFileSync("/home/claude/argon_f1_2026_simulator_v9.html","utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.split("const canvas = document.getElementById")[0];
const ctx={Math,console,Set,Float64Array};vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(fs.readFileSync("geo.js","utf8").split("vm.runInContext(`")[1].split("`,ctx);")[0],ctx);
vm.runInContext(fs.readFileSync("geo2.js","utf8").split("vm.runInContext(`")[2].split("`,ctx);")[0],ctx);
vm.runInContext(`
// Minimum-curvature line: biharmonic relaxation, p_k -> (-p_{k-2J} + 4p_{k-J} + 4p_{k+J} - p_{k+2J})/6
function minCurvBi(margin, iters, J, alpha){
  const M=spline.length; let lat=new Float64Array(M); const lim=HALF_TRACK-margin;
  const P=(i)=>{i=(i%M+M)%M;const q=spline[i];return [q.x+q.nx*lat[i], q.y+q.ny*lat[i]];};
  for(let it=0;it<iters;it++){
    for(let k=0;k<M;k++){
      const a=P(k-2*J),b=P(k-J),c=P(k+J),d=P(k+2*J),p=spline[k];
      const tx=(-a[0]+4*b[0]+4*c[0]-d[0])/6, ty=(-a[1]+4*b[1]+4*c[1]-d[1])/6;
      const t=(tx-p.x)*p.nx+(ty-p.y)*p.ny;
      lat[k]=Math.max(-lim,Math.min(lim,lat[k]+alpha*(t-lat[k])));
    }
  }
  return lat;
}`,ctx);
for (const t of ["barcelona","imola","monza"]) {
  console.log(vm.runInContext(`(()=>{activeTrackKey="${t}";buildSpline("${t}");const cfg=CIRCUITS["${t}"];let o="${t}: centre="+lapTime(null,8,cfg).toFixed(1);
  for(const J of [6,10,16,24]){const lat=minCurvBi(1.6,1500,J,0.5);o+=" | bi"+J+"="+lapTime(lat,8,cfg).toFixed(1);}
  return o;})()`,ctx));
}
