// One flying lap of a team's car vs the real fastest lap of a driver. Usage: npx vite-node tools/physics/lap.ts [team] [driver]
import { loadTrack, loadCars, loadTelemetry } from "./node-load";
import { flyingLap } from "../../src/sim/lap";

const team = process.argv[2] ?? "mercedes", code = process.argv[3] ?? "RUS";
const trk = loadTrack(), C = loadCars(), tel = loadTelemetry(), ref = tel.drivers[code];
const p = C.build(team);
const t0 = performance.now(); const r = flyingLap(trk, p); const ms = performance.now() - t0;
console.log(`${team} sim ${r.time.toFixed(3)} s (plan ${r.profile.lapTime.toFixed(3)}), real ${code} ${ref.lap} s; crashed=${r.crashed}; max off-track ${r.maxOff.toFixed(1)} m; ${ms.toFixed(0)} ms CPU`);
console.log(`sectors sim ${r.sectors.map(x => x.toFixed(3)).join(" / ")}  real ${ref.s1} / ${ref.s2} / ${ref.s3}`);
console.log(`energy: deploy ${(r.deployJ / 1e6).toFixed(2)} MJ (plan ${(r.profile.deployJ / 1e6).toFixed(2)}), harvest ${(r.harvestJ / 1e6).toFixed(2)} MJ (plan ${(r.profile.harvestJ / 1e6).toFixed(2)}), clip zone ${r.profile.dClip.toFixed(0)} m, clip ${(r.profile.clip / 1e3).toFixed(0)} kW`);
let se = 0, nn = 0; for (let i = 0; i < r.v.length; i++) { se += (r.v[i] - ref.v[i]) ** 2; nn++; }
console.log(`speed RMS error ${Math.sqrt(se / nn).toFixed(1)} km/h`);
for (let i = 0; i < r.v.length; i += +(process.argv[4] ?? 20)) console.log(`${(i * 5).toString().padStart(5)} m  plan ${r.plan[i].toFixed(0).padStart(4)} sim ${r.v[i].toFixed(0).padStart(4)} ey ${r.off[i].toFixed(1).padStart(5)} soc ${r.soc[i].toFixed(1)} g${r.gear[i]} thr${r.thr[i].toFixed(0).padStart(4)} brk${r.brk[i].toFixed(0).padStart(4)} | real ${ref.v[i].toFixed(0).padStart(4)} g${ref.gear[i]} thr${String(ref.thr[i]).padStart(4)} brk${String(ref.brk[i]).padStart(4)}  dt ${(r.t[i] - ref.t[i]).toFixed(2)}`);
// time lost against the plan, per 200 m
{ const pt: number[] = [0]; let k = 0, acc = 0, kk = 0;
  for (let b = 1; b < r.v.length; b++) { while (k < trk.ln - 1 && trk.lsc[k + 1] <= b * 5) { acc += trk.lds / r.profile.v[k]; k++; } pt.push(acc); }
  const line: string[] = []; for (let b = 40; b < r.v.length; b += 40) { line.push(`${b * 5}:${((r.t[b] - r.t[b - 40]) - (pt[b] - pt[b - 40])).toFixed(2)}`); kk++; }
  console.log("sim - plan per 200 m: " + line.join(" ")); }
