const fs=require("fs"),vm=require("vm");
let code=fs.readFileSync("/home/claude/argon_f1_2026_simulator_v9.html","utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.split("const canvas = document.getElementById")[0];
const ctx={Math,console,Set,Float64Array};vm.createContext(ctx);vm.runInContext(code,ctx);
vm.runInContext(fs.readFileSync("geo.js","utf8").split("vm.runInContext(`")[1].split("`,ctx);")[0],ctx);
vm.runInContext(`
function lapTime(lat, step, cfg){
  const Rl=radiiOf(lat,step); const M=1400; const ds=cfg.lengthMeters/M; const g=9.81; const vc=new Float64Array(M);
  for(let k=0;k<M;k++){const R=Math.max(8,Rl[k]); const den=1/R-g*2.6/4900; vc[k]=den<=0?95:Math.min(95,Math.sqrt(g*1.7/den));}
  const vb=Float64Array.from(vc); for(let l=0;l<3;l++)for(let k=M-1;k>=0;k--){const n=vb[(k+1)%M];const a=g*(1.6+2.4*(n/70)**2)*0.92;vb[k]=Math.min(vb[k],Math.sqrt(n*n+2*a*ds));}
  const vf=Float64Array.from(vb); for(let l=0;l<3;l++)for(let k=1;k<=M;k++){const p=vf[(k-1)%M];const acc=Math.max(0,14.5*(1-(p/95)**2.2));vf[k%M]=Math.min(vb[k%M],Math.sqrt(p*p+2*acc*ds));}
  let T=0;for(let k=0;k<M;k++)T+=ds/Math.max(5,vf[k]); return T;
}
// smoother relaxation: Laplacian smoothing of the path (2nd difference) projected on normal
function minCurv2(margin, iters, J, alpha){
  const M=spline.length; let lat=new Float64Array(M); const lim=HALF_TRACK-margin;
  for(let it=0;it<iters;it++){
    for(let k=0;k<M;k++){
      const ia=(k-J+M)%M, ib=(k+J)%M, a=spline[ia], b=spline[ib], p=spline[k];
      const mx=(a.x+a.nx*lat[ia]+b.x+b.nx*lat[ib])/2, my=(a.y+a.ny*lat[ia]+b.y+b.ny*lat[ib])/2;
      const t=(mx-p.x)*p.nx+(my-p.y)*p.ny;
      lat[k]=Math.max(-lim,Math.min(lim,lat[k]+alpha*(t-lat[k])));
    }
  }
  return lat;
}`,ctx);
for (const t of ["barcelona","imola","monza"]) {
  console.log(vm.runInContext(`(()=>{activeTrackKey="${t}";buildSpline("${t}");const cfg=CIRCUITS["${t}"];let o="${t}: centre="+lapTime(null,8,cfg).toFixed(1);
  for(const J of [8,14,22,32]){const lat=minCurv2(1.6,800,J,0.6);o+=" | J"+J+"="+lapTime(lat,8,cfg).toFixed(1);}
  // multiscale
  {let lat=new Float64Array(1400); for(const J of [40,24,14,8]){ const l2=(function(){const M=1400;let L=Float64Array.from(lat);const lim=HALF_TRACK-1.6;for(let it=0;it<400;it++){for(let k=0;k<M;k++){const ia=(k-J+M)%M,ib=(k+J)%M,a=spline[ia],b=spline[ib],p=spline[k];const mx=(a.x+a.nx*L[ia]+b.x+b.nx*L[ib])/2,my=(a.y+a.ny*L[ia]+b.y+b.ny*L[ib])/2;const tt=(mx-p.x)*p.nx+(my-p.y)*p.ny;L[k]=Math.max(-lim,Math.min(lim,L[k]+0.6*(tt-L[k])));}}return L;})(); lat=l2;} o+=" | multi="+lapTime(lat,8,cfg).toFixed(1);}
  return o;})()`,ctx));
}
