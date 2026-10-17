// Fit a team's car to its best real 2026 Barcelona Q lap. The dynamic car, driven by the lab AI at 100 %, must
// reproduce the real speed trace (5 m bins, OpenF1) and lap time. Fitted: tyre grip and load sensitivity, downforce,
// drag in both wing modes, ICE power, and the team's MGU-K map (clip power, clip distance), within the FIA energy rules.
// Usage: npx vite-node tools/physics/fit.ts [team ...]   (ITERS=n)  -> data/cars/physics_2026.json
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { loadTrack, loadCars, loadTelemetry } from "./node-load";
import { flyingLap, labPlan } from "../../src/sim/lap";
import { plan } from "../../src/sim/qss";
import { buildCar, DEFAULT_FIT, type FitValues, type PhysicsJson } from "../../src/sim/car";
import { inferKMap } from "./energy-map";

const trk = loadTrack(), C = loadCars(), tel = loadTelemetry();
const KEYS: (keyof FitValues)[] = ["mu", "sens", "claZ", "cdaZ", "ice", "muX"];
const STEP = [0.12, 0.04, 0.6, 0.12, 30, 0.08];
// Speed traces cannot separate Straight Mode drag from energy clipping (both flatten the straights), so the X-mode
// drag is tied to the Z-mode drag: FIA 2026 announcement, drag -55 % (low-drag mode) vs downforce -30 % against 2025
// cars; taken as X = 0.55 x Z (estimate).
const X_OVER_Z = 0.55;
// Plausible ranges (published estimates): 2025 cars CdA ~1.0-1.4 m2, ClA ~4.5-5.5 m2; 2026 Z mode a little less
// drag, 30 % less downforce; 2026 ICE ~350-420 kW. The fit stays inside them.
const LIMITS: Record<string, [number, number]> = { mu: [1.3, 2.4], sens: [0, 0.3], claZ: [2.5, 6], cdaZ: [0.8, 1.3], cdaX: [0.3, 1.3], ice: [330, 420], clip: [0, 350], dClip: [0, 1200], muX: [0.6, 1.1] };
const OUT = "data/cars/physics_2026.json";

function nelderMead(f: (x: number[]) => number, x0: number[], step: number[], iters: number) {
  const n = x0.length; let pts = [x0, ...x0.map((_, i) => x0.map((v, j) => (j === i ? v + step[i] : v)))].map(x => ({ x, f: f(x) }));
  for (let it = 0; it < iters; it++) {
    pts.sort((a, b) => a.f - b.f);
    const c = x0.map((_, j) => pts.slice(0, n).reduce((s, p) => s + p.x[j], 0) / n), w = pts[n];
    const at = (t: number) => c.map((cj, j) => cj + t * (w.x[j] - cj));
    const r = at(-1), fr = f(r);
    if (fr < pts[0].f) { const e = at(-2), fe = f(e); pts[n] = fe < fr ? { x: e, f: fe } : { x: r, f: fr }; }
    else if (fr < pts[n - 1].f) pts[n] = { x: r, f: fr };
    else { const k = at(fr < w.f ? -0.5 : 0.5), fk = f(k);
      if (fk < Math.min(fr, w.f)) pts[n] = { x: k, f: fk };
      else pts = pts.map((p, i) => (i === 0 ? p : { x: p.x.map((v, j) => pts[0].x[j] + 0.5 * (v - pts[0].x[j])), f: NaN })).map(p => (isNaN(p.f) ? { x: p.x, f: f(p.x) } : p)); }
    if (it % 10 === 0) console.log(`  it ${it} best ${pts[0].f.toFixed(3)} [${pts[0].x.map(v => v.toFixed(3)).join(", ")}]`);
  }
  pts.sort((a, b) => a.f - b.f); return pts[0];
}

const prev: PhysicsJson = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { base: {}, teams: {} };
const teams = process.argv.slice(2).length ? process.argv.slice(2) : ["mercedes"];
for (const team of teams) {
  const code = Object.entries(tel.drivers).filter(([, d]) => d.team === team).sort((a, b) => a[1].lap - b[1].lap)[0][0], ref = tel.drivers[code];
  const start: FitValues = { ...DEFAULT_FIT, ...(prev.teams.mercedes ?? {}), ...(prev.teams[team] ?? {}) };
  if (start.clip < 50) start.clip = 150;
  for (const k of KEYS) start[k] = Math.min(LIMITS[k][1] - 1e-3, Math.max(LIMITS[k][0] + 1e-3, start[k]));
  // the team's MGU-K map is inferred from the real lap for each candidate car (it depends on drag, mass, ICE)
  const toFit = (x: number[]): PhysicsJson => {
    const t: FitValues & { kmap?: number[] } = { ...start, ...Object.fromEntries(KEYS.map((k, i) => [k, x[i]])) }; t.cdaX = X_OVER_Z * t.cdaZ;
    t.kmap = inferKMap(trk, buildCar(team, C.cars, C.gearing, { base: {}, teams: { [team]: t } }), ref);
    return { base: {}, teams: { [team]: t } };
  };
  const evalLap = (x: number[]) => { const p = buildCar(team, C.cars, C.gearing, toFit(x)); return flyingLap(trk, p, labPlan(p)); };
  const p0 = (r: ReturnType<typeof evalLap>) => 4e6 + r.profile.harvestJ;
  const cost = (x: number[]) => {
    if (KEYS.some((k, i) => x[i] < LIMITS[k][0] || x[i] > LIMITS[k][1])) return 1e6;
    const r = evalLap(x);
    if (r.crashed || !isFinite(r.time)) return 1e5;
    let se = 0; for (let b = 0; b < r.v.length; b++) se += (r.v[b] - ref.v[b]) ** 2;
    const soc = Math.min(...r.soc), pen = soc < 0.05 ? (0.05 - soc) * 40 : 0;          // ran the store flat
    // energy rules: the inferred map must fit the store (never below 0) and the 7 MJ harvest limit
    const ePen = (r.profile.minSoc < 0 ? -r.profile.minSoc / 1e5 : 0) + Math.max(0, r.profile.deployJ - p0(r)) / 1e5;
    return Math.sqrt(se / r.v.length) + 3 * Math.abs(r.time - ref.lap) + pen + ePen;
  };
  console.log(`${team}: fitting to ${code} ${ref.lap}`);
  const best = nelderMead(cost, KEYS.map(k => start[k]), STEP, +(process.env.ITERS ?? 120));
  const fit = toFit(best.x).teams[team]!, r = evalLap(best.x);
  console.log(`${team}: cost ${best.f.toFixed(2)}, lap ${r.time.toFixed(3)} vs ${ref.lap}, sectors ${r.sectors.map(s => s.toFixed(3)).join("/")} vs ${ref.s1}/${ref.s2}/${ref.s3}`, fit);
  prev.teams[team] = Object.fromEntries(Object.entries(fit).map(([k, v]) => [k, Array.isArray(v) ? v : Math.round((v as number) * 1000) / 1000])) as any;
  (prev as any).meta = { fitted_to: "fastest 2026 Barcelona Q lap of each team (OpenF1), dynamic car + lab AI driver at 100 %", date: new Date().toISOString().slice(0, 10) };
  writeFileSync(OUT, JSON.stringify(prev, null, 1));
}
void plan;
