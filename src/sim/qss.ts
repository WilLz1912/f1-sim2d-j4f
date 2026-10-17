// Quasi-steady-state lap: the fastest speed profile a point mass with this car's grip, aero, power and energy can
// hold along the racing line (forward pass = acceleration, backward pass = braking). The lab driver uses it as its
// plan; it is not the lap time of the car (the dynamic model in vehicle.ts decides that).
import type { CarParams } from "./car";
import { kLimit, KMAP_STEP } from "./car";
import type { TrackModel } from "./track";
import { G, wheelLoads, tyreCap } from "./vehicle";

export interface Profile {
  v: Float64Array;          // target speed at each racing-line point (m/s)
  full: Uint8Array;         // 1 where the plan is flat out
  modeX: Uint8Array;        // 1 where Straight Mode is used
  kp: Float64Array;         // planned MGU-K power (W, + deploy, - harvest at full throttle)
  soc: Float64Array;        // planned energy in the store (J), full at the control line
  minSoc: number;           // lowest planned store level (J); < 0 = the energy map is not feasible
  clipZone: Uint8Array;     // 1 where the MGU-K harvests at full throttle (the last dClip metres before braking)
  dClip: number; clip: number;   // clipping distance (m) and power (W)
  lapTime: number; deployJ: number; harvestJ: number;
}
export interface PlanOpts {
  grip: number; brakeGrip: number; vStart?: number;
  clips?: number[];            // clipping powers to try (W); the plan picks the fastest feasible energy map
  energy?: { clip: number; dClip: number; kmap?: number[] | null };   // or a fixed energy map (fitted to the real traces)
}

export function iceFactor(p: CarParams, v: number) {
  const pt = p.pt; let g = 1; while (g < 8 && v / pt.vpr[g] > pt.upRpm) g++;
  const rpm = Math.max(4000, v / pt.vpr[g]);
  return rpm < pt.rpmFull ? rpm / pt.rpmFull : rpm > pt.rpmMax ? Math.max(0, 1 - (rpm - pt.rpmMax) / 800) : 1;
}

export function plan(trk: TrackModel, p: CarParams, o: PlanOpts): Profile {
  const n = trk.ln, ds = trk.lds, m = p.mass, t = p.tyre;
  const st = new Int32Array(n), modeX = new Uint8Array(n);
  for (let k = 0; k < n; k++) { st[k] = Math.min(trk.n - 1, Math.round(trk.lsc[k] / trk.ds)); modeX[k] = trk.straightMode[st[k]] && Math.abs(trk.lk[k]) < 1 / 500 ? 1 : 0; }
  const fz = [0, 0, 0, 0], cap = [0, 0, 0, 0], wbF = p.b / p.wb, wbR = p.a / p.wb;
  const loads = (k: number, v: number, ax: number, ay: number, grip: number) => {
    wheelLoads(p, modeX[k] ? p.aeroX : p.aeroZ, v, trk.grade[st[k]], trk.kv[st[k]], ax, ay, fz);
    for (let i = 0; i < 4; i++) cap[i] = tyreCap(p, fz[i]) * grip;
  };
  const resist = (k: number, v: number) => 0.5 * p.rho * v * v * (modeX[k] ? p.aeroX.cda : p.aeroZ.cda) + m * G * trk.grade[st[k]] + t.crr * m * G;
  // steady cornering limit at speed v: both axles must carry their share of m*ay (load transfer, load sensitivity)
  // at constant speed the rear also drives against drag, which takes part of its grip (friction ellipse)
  const ayMax = (k: number, v: number, grip: number) => {
    let lo = 0, hi = 80; const res = Math.max(0, resist(k, v)), res2 = res * res;
    for (let it = 0; it < 18; it++) {
      const ay = (lo + hi) / 2; loads(k, v, 0, ay, grip); const cR = cap[2] + cap[3];
      if (m * ay * wbF <= cap[0] + cap[1] && m * ay * wbR <= Math.sqrt(Math.max(0, cR * cR - res2))) lo = ay; else hi = ay;
    }
    return lo;
  };
  // acceleration: power, rear traction left after the rear's side force (friction ellipse), and the front must still
  // carry its side force with the load moved rearwards by the acceleration (else the car runs wide)
  const accelMax = (k: number, v: number, ay: number, grip: number) => {
    const fPow = p.pt.eta * p.pt.ice * iceFactor(p, v) / Math.max(v, 4) + kNow / Math.max(v, 4), res = resist(k, v);
    let ax = 3;
    for (let it = 0; it < 3; it++) {
      loads(k, v, ax, ay, grip); const cR = cap[2] + cap[3], u = Math.min(1, m * ay * wbR / Math.max(cR, 1));
      ax = (Math.min(fPow, t.muX * cR * Math.sqrt(1 - u * u)) - res) / m;
    }
    if (ay > 0.5 && ax > 0) {                                        // front check: largest ax the front tolerates
      loads(k, v, ax, ay, grip);
      if (cap[0] + cap[1] < m * ay * wbF) {
        let lo = 0, hi = ax;
        for (let it = 0; it < 8; it++) { const mid = (lo + hi) / 2; loads(k, v, mid, ay, grip); if (cap[0] + cap[1] >= m * ay * wbF) lo = mid; else hi = mid; }
        ax = lo;
      }
    }
    return ax;
  };
  let kNow = 0;
  const brakeMax = (k: number, v: number, ay: number, grip: number) => {
    let dec = 30;
    for (let it = 0; it < 3; it++) {
      loads(k, v, -dec, ay, grip);
      const cF = cap[0] + cap[1], cR = cap[2] + cap[3], uF = Math.min(1, m * ay * wbF / Math.max(cF, 1)), uR = Math.min(1, m * ay * wbR / Math.max(cR, 1));
      const eF = Math.sqrt(1 - uF * uF), eR = Math.sqrt(1 - uR * uR);
      const fb = Math.min(t.muX * 2 * Math.min(cap[0], cap[1]) * eF / p.brake.balF, t.muX * cR * eR / (1 - p.brake.balF), p.brake.maxF);
      dec = (fb + resist(k, v)) / m;
    }
    return dec;
  };
  // cornering limit speed
  const vLat = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const kk = Math.abs(trk.lk[k]); let v = 110;
    if (kk > 1e-5) for (let it = 0; it < 12; it++) v = Math.min(110, 0.5 * v + 0.5 * Math.sqrt(ayMax(k, v, o.grip) / kk));
    vLat[k] = v;
  }
  // Energy policy (the team's map): at full throttle the MGU-K deploys, and within `dClip` metres of the next braking
  // point it harvests `clip` W instead ("super clipping": speed gained there would be braked away anyway; the real
  // 2026 traces show it at the end of every straight). FIA rule: at full throttle the PU power may fall only
  // 100 kW/s, except in the listed windows. Braking resets the K to regeneration.
  const rate = trk.reductionRate * 1000, free = p.pt.session === "quali" ? trk.freeCutQ : trk.freeCut;
  const km = o.energy?.kmap, kmapW = km ? Float64Array.from({ length: n }, (_, k) => 1000 * km[Math.min(km.length - 1, Math.floor(trk.lsc[k] / KMAP_STEP))]) : null;
  const run = (dClip: number, clipW: number, brakeZone: Uint8Array | null) => {
    const toBrake = new Float64Array(n);
    if (brakeZone) { let d = 1e9; for (let pass = 0; pass < 2; pass++) for (let k = n - 1; k >= 0; k--) { d = brakeZone[k] ? 0 : d + ds; toBrake[k] = d; } }
    const vf = new Float64Array(n), kp = new Float64Array(n), full = new Uint8Array(n);
    let v = o.vStart ?? Math.min(...Array.from(vLat.slice(0, 50))), pk = 0, clipJ = 0;
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < n; k++) {
      v = Math.min(v, vLat[k]); vf[k] = v;
      const dt = ds / Math.max(v, 5), kmax = kLimit(p.pt.kCurve, v * 3.6);
      if (brakeZone && brakeZone[k]) pk = 0;
      else {
        let target = kmapW ? kmapW[k] : !brakeZone || toBrake[k] > dClip ? kmax : -clipW;
        if (target < 0 && clipJ >= p.pt.harvestLapJ) target = 0;
        if (target < pk && !free[st[k]]) target = Math.max(target, pk - rate * dt);
        pk = Math.min(target, kmax);
      }
      kp[k] = pk; if (pass && pk < 0) clipJ += -pk * p.pt.etaK * dt;
      kNow = p.pt.eta * pk;
      const ay = v * v * Math.abs(trk.lk[k]), a = accelMax(k, v, ay, o.grip);
      const fPow = p.pt.eta * (p.pt.ice * iceFactor(p, v) + pk) / Math.max(v, 4);
      if (pass) full[k] = a * m + resist(k, v) >= fPow - 1 ? 1 : 0;
      v = Math.sqrt(Math.max(1, v * v + 2 * a * ds));
    }
    // backward pass (braking), two laps
    const vb = new Float64Array(vf); let u = vb[0];
    for (let pass = 0; pass < 2; pass++) for (let k = n - 1; k >= 0; k--) {
      u = Math.min(u, vb[k]); vb[k] = u;
      const dec = brakeMax(k, u, u * u * Math.abs(trk.lk[k]), o.brakeGrip);
      u = Math.sqrt(u * u + 2 * dec * ds);
    }
    // energy and time along the final profile
    const bz = new Uint8Array(n), soc = new Float64Array(n); let time = 0, dep = 0, regen = 0, clip = 0, e = p.pt.esJ, harvSoFar = 0;
    for (let k = 0; k < n; k++) {
      const v1 = vb[k], v2 = vb[(k + 1) % n], dt = 2 * ds / (v1 + v2); time += dt;
      bz[k] = vb[k] < vf[k] - 0.05 ? 1 : 0;
      const d0 = dep, h0 = regen + clip;
      if (bz[k]) { full[k] = 0; if (v2 < v1) { const fb = Math.max(0, m * (v1 * v1 - v2 * v2) / (2 * ds) - resist(k, v1)); regen += Math.min(p.pt.kHarvest, fb * (1 - p.brake.balF) * v1) * p.pt.etaK * dt; } }
      else {                                   // K energy actually used: the wheel power needed beyond the ICE
        const used = (m * (v2 * v2 - v1 * v1) / (2 * ds) + resist(k, v1)) * v1 / p.pt.eta;   // wheel power needed (W, at the PU)
        const ice = p.pt.ice * iceFactor(p, v1);
        if (!full[k] && used > 0 && used < ice) clip += Math.min(p.pt.kHarvest, ice - used) * p.pt.etaK * dt;   // part-throttle harvest
        else if (kp[k] > 0) dep += Math.min(kp[k], Math.max(0, used - ice)) / p.pt.etaK * dt; else if (full[k]) clip += -kp[k] * p.pt.etaK * dt;
      }
      const dh = Math.max(0, Math.min(regen + clip - h0, p.pt.harvestLapJ - harvSoFar)); harvSoFar += dh;
      e = Math.min(p.pt.esJ, e - (dep - d0) + dh); soc[k] = e;
    }
    return { v: vb, full, bz, kp, toBrake, soc, time, dep, harv: Math.min(p.pt.harvestLapJ, regen + clip) };
  };
  // braking zones depend little on the energy policy: take them once from a full-deployment lap, then every
  // candidate policy is evaluated against the same zones (consistent comparisons)
  const bz0 = run(1e9, 0, run(1e9, 0, null).bz).bz;
  const run2 = (dClip: number, clipW: number) => run(dClip, clipW, bz0);
  // energy plan: for each clipping power, the shortest clipping distance whose energy fits in the store + this lap's
  // harvest; keep the fastest combination
  // feasible: the store never runs below a 0.25 MJ reserve along the lap (the car never follows the plan exactly)
  const ok = (r: { soc: Float64Array }) => { let mn = Infinity; for (let k = 0; k < n; k++) mn = Math.min(mn, r.soc[k]); return mn >= 0.25e6; };
  let best: ReturnType<typeof run> | null = null, dClip = 0, clip = 0;
  if (o.energy) { best = run2(o.energy.dClip, o.energy.clip); dClip = o.energy.dClip; clip = o.energy.clip; }
  else for (const clipW of o.clips ?? [100e3, 200e3, 300e3, 350e3]) {
    let lo = 0, hi = 1200, r0 = run2(hi, clipW), c0 = hi;
    if (!ok(r0)) continue;
    for (let it = 0; it < 9; it++) {
      const mid = (lo + hi) / 2, r = run2(mid, clipW);
      if (ok(r)) { hi = mid; r0 = r; c0 = mid; } else lo = mid;
    }
    if (!best || r0.time < best.time) { best = r0; dClip = c0; clip = clipW; }
  }
  if (!best) { clip = p.pt.kHarvest; dClip = 5000; best = run2(dClip, clip); }   // energy-starved car: harvest everywhere
  let minSoc = Infinity; for (let k = 0; k < n; k++) minSoc = Math.min(minSoc, best.soc[k]);
  const clipZone = new Uint8Array(n); for (let k = 0; k < n; k++) clipZone[k] = best.toBrake[k] <= dClip && !best.bz[k] ? 1 : 0;
  return { v: best.v, full: best.full, modeX, kp: best.kp, soc: best.soc, minSoc, clipZone, dClip, clip, lapTime: best.time, deployJ: best.dep, harvestJ: best.harv };
}
