// Every team's fitted car, one flying lap each with the lab AI, against the team's best real 2026 Barcelona Q lap.
// Usage: npx vite-node tools/physics/report.ts
import { loadTrack, loadCars, loadTelemetry } from "./node-load";
import { flyingLap } from "../../src/sim/lap";
const trk = loadTrack(), C = loadCars(), tel = loadTelemetry();
const rows = Object.keys(C.cars.teams).map(team => {
  const [code, ref] = Object.entries(tel.drivers).filter(([, d]) => d.team === team).sort((a, b) => a[1].lap - b[1].lap)[0];
  const r = flyingLap(trk, C.build(team)); let se = 0; for (let i = 0; i < r.v.length; i++) se += (r.v[i] - ref.v[i]) ** 2;
  const f = C.fit?.teams[team];
  return { team, code, real: ref.lap, sim: r.time, d: r.time - ref.lap, s: r.sectors.map((x, i) => x - [ref.s1, ref.s2, ref.s3][i]), rms: Math.sqrt(se / r.v.length),
    vmax: Math.max(...r.v), vmaxReal: Math.max(...ref.v), f, crashed: r.crashed };
}).sort((a, b) => a.real - b.real);
console.log("team       drv  real     sim      diff   S1     S2     S3    RMS km/h  vmax sim/real   mu   sens  muX  ClA  CdA  ICE");
for (const r of rows) console.log(`${r.team.padEnd(10)} ${r.code} ${r.real.toFixed(3)} ${r.sim.toFixed(3)} ${r.d >= 0 ? "+" : ""}${r.d.toFixed(3)} ${r.s.map(x => (x >= 0 ? "+" : "") + x.toFixed(2)).join(" ")}  ${r.rms.toFixed(1).padStart(5)}   ${r.vmax.toFixed(0)}/${r.vmaxReal.toFixed(0)}   ${r.f ? [r.f.mu, r.f.sens, r.f.muX, r.f.claZ, r.f.cdaZ, r.f.ice].map(x => x?.toFixed(2)).join(" ") : "-"}${r.crashed ? " CRASH" : ""}`);
