// QSS plan of a team's (fitted) car vs the real lap, every N metres. Usage: npx vite-node tools/physics/cmp.ts team code step
import { loadTrack, loadCars, loadTelemetry, planOnBins } from "./node-load";
import { plan } from "../../src/sim/qss";
const trk = loadTrack(), C = loadCars(), tel = loadTelemetry();
const team = process.argv[2] ?? "mercedes", ref = tel.drivers[process.argv[3] ?? "RUS"], step = +(process.argv[4] ?? 10);
const p = C.build(team), pr = plan(trk, p, { grip: 1, brakeGrip: 1 }), v = planOnBins(trk, pr.v, ref.v.length);
console.log(`plan ${pr.lapTime.toFixed(3)} real ${ref.lap}; dClip ${pr.dClip.toFixed(0)} m clip ${pr.clip / 1e3} dep ${(pr.deployJ / 1e6).toFixed(2)} harv ${(pr.harvestJ / 1e6).toFixed(2)}`);
let k = 0;
for (let b = 0; b < ref.v.length; b += step) { const s = b * 5; while (trk.lsc[k + 1] <= s) k++;
  console.log(`${String(s).padStart(5)} plan ${v[b].toFixed(0).padStart(4)} real ${ref.v[b].toFixed(0).padStart(4)} thr ${String(ref.thr[b]).padStart(3)} brk ${String(ref.brk[b]).padStart(3)} | full ${pr.full[k]} K ${(pr.kp[k] / 1e3).toFixed(0).padStart(4)} R ${Math.min(9999, 1 / Math.abs(trk.lk[k])).toFixed(0).padStart(5)}`); }
