const fs=require("fs"),vm=require("vm");
let code=fs.readFileSync("/home/claude/argon_f1_2026_simulator_v9.html","utf8").match(/<script>([\s\S]*)<\/script>/)[1];
code=code.split("const canvas = document.getElementById")[0];
const ctx={Math,console,Set,Float64Array};vm.createContext(ctx);vm.runInContext(code,ctx);
// Min-curvature racing line via elastic band, then radii in metres
vm.runInContext(`
function minCurvLine(margin, iters, J) {
  const M = spline.length; let lat = new Float64Array(M);
  const lim = HALF_TRACK - margin;
  for (let it = 0; it < iters; it++) {
    const nl = new Float64Array(M);
    for (let k = 0; k < M; k++) {
      const a = spline[(k - J + M) % M], b = spline[(k + J) % M], p = spline[k];
      const ax = a.x + a.nx * lat[(k - J + M) % M], ay = a.y + a.ny * lat[(k - J + M) % M];
      const bx = b.x + b.nx * lat[(k + J) % M], by = b.y + b.ny * lat[(k + J) % M];
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const t = (mx - p.x) * p.nx + (my - p.y) * p.ny;
      nl[k] = Math.max(-lim, Math.min(lim, lat[k] + 0.5 * (t - lat[k])));
    }
    lat = nl;
  }
  return lat;
}
function radiiOf(lat, step) {
  const M = spline.length; const R = new Float64Array(M);
  for (let k = 0; k < M; k++) {
    const P = i => { const q = spline[(i + M) % M]; const l = lat ? lat[(i + M) % M] : 0; return [q.x + q.nx * l, q.y + q.ny * l]; };
    const A = P(k - step), B = P(k), C = P(k + step);
    const ab = Math.hypot(B[0]-A[0],B[1]-A[1]), bc = Math.hypot(C[0]-B[0],C[1]-B[1]), ca = Math.hypot(A[0]-C[0],A[1]-C[1]);
    const cross = (B[0]-A[0])*(C[1]-A[1]) - (B[1]-A[1])*(C[0]-A[0]);
    R[k] = Math.abs(cross) < 1e-9 ? 1e9 : (ab*bc*ca)/(2*Math.abs(cross)) * unitToMeter;
  }
  return R;
}
`,ctx);
for (const t of ["barcelona","imola","monza"]) {
  console.log(vm.runInContext(`(()=>{activeTrackKey="${t}";buildSpline("${t}");const cfg=CIRCUITS["${t}"];
   const Rc=radiiOf(null,6); const lat=minCurvLine(1.6,600,6); const Rl=radiiOf(lat,6);
   let out="${t} u2m="+unitToMeter.toFixed(2)+"\\n";
   for(const c of cfg.corners){let mc=1e9,ml=1e9;for(let d=-30;d<=30;d++){const k=(c.kIdx+d+1400)%1400;mc=Math.min(mc,Rc[k]);ml=Math.min(ml,Rl[k]);}
     const g=9.81; const v=(R)=>{const den=1/R - g*2.6/4900; return den<=0?99:Math.min(99,Math.sqrt(g*1.7/den));};
     out+="  T"+c.num+" bảng="+c.R_meters+"m | tim đường="+mc.toFixed(0)+"m | racing line="+ml.toFixed(0)+"m -> v="+(v(ml)*3.6).toFixed(0)+" km/h\\n";}
   // estimate lap time on racing line with simple forward/backward pass
   const M=1400; const ds=cfg.lengthMeters/M; const vc=new Float64Array(M);
   const g=9.81; for(let k=0;k<M;k++){const R=Math.max(10,Rl[k]); const den=1/R-g*2.6/4900; vc[k]=den<=0?95:Math.min(95,Math.sqrt(g*1.7/den));}
   const vb=Float64Array.from(vc); for(let l=0;l<3;l++)for(let k=M-1;k>=0;k--){const n=vb[(k+1)%M];const a=g*(1.6+2.4*(n/70)**2)*0.92;vb[k]=Math.min(vb[k],Math.sqrt(n*n+2*a*ds));}
   const vf=Float64Array.from(vb); for(let l=0;l<3;l++)for(let k=1;k<=M;k++){const p=vf[(k-1)%M];const acc=Math.max(0,14.5*(1-(p/95)**2.2));vf[k%M]=Math.min(vb[k%M],Math.sqrt(p*p+2*acc*ds));}
   let T=0;for(let k=0;k<M;k++)T+=ds/Math.max(5,vf[k]); out+="  ước lượng lap time ~"+T.toFixed(1)+"s, vmax "+(Math.max(...vf)*3.6).toFixed(0)+" km/h, vmin "+(Math.min(...vf)*3.6).toFixed(0)+" km/h";
   return out;})()`,ctx));
}
