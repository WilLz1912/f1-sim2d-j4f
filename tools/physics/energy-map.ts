// A team's MGU-K map inferred from its real lap: at full throttle the power the PU must have delivered follows from
// the measured acceleration, drag, slope and rolling resistance of the car (P = F v / eta); minus the ICE (at full
// load whenever the pedal is down) gives the MGU-K power (+ deploy, - harvest/clipping). Same at part throttle (the
// driver's pedal sets the total). Braking: 0 (regeneration is automatic). Averaged every KMAP_STEP m, clamped to the
// FIA limits.
import type { TrackModel } from "../../src/sim/track";
import { type CarParams, kLimit, KMAP_STEP } from "../../src/sim/car";
import { iceFactor } from "../../src/sim/qss";

export function inferKMap(trk: TrackModel, p: CarParams, ref: { v: number[]; thr: number[]; brk: number[] }): number[] {
  const n = ref.v.length, BIN = 5, G = 9.81;
  const raw = ref.v.map(x => x / 3.6), v = raw.map((_, b) => {                   // light smoothing (3.7 Hz source)
    let s = 0, w = 0; for (let k = -2; k <= 2; k++) { const j = (b + k + n) % n, q = Math.exp(-(k * k) / 4); s += raw[j] * q; w += q; } return s / w; });
  const kmap: number[] = [], per = KMAP_STEP / BIN;
  for (let c = 0; c * per < n; c++) {
    let sum = 0, cnt = 0, part = 0, brake = 0;
    for (let b = c * per; b < Math.min(n, (c + 1) * per); b++) {
      if (ref.brk[b] > 0) { brake++; continue; }
      if (ref.thr[b] < 98) part++;
      const i = Math.min(trk.n - 1, Math.round(b * BIN / trk.ds)), x = trk.straightMode[i] ? p.aeroX : p.aeroZ;
      const vb = v[b], a = (v[(b + 1) % n] ** 2 - v[(b - 1 + n) % n] ** 2) / (4 * BIN);
      const F = p.mass * a + 0.5 * p.rho * vb * vb * x.cda + p.mass * G * trk.grade[i] + p.tyre.crr * (p.mass * G + 0.5 * p.rho * vb * vb * x.cla);
      const k = F * vb / p.pt.eta - p.pt.ice * iceFactor(p, vb);
      sum += Math.max(-p.pt.kHarvest, Math.min(kLimit(p.pt.kCurve, vb * 3.6), k)); cnt++;
    }
    kmap.push(cnt > brake ? Math.round(sum / cnt / 1000) : 0);
  }
  return kmap;
}
