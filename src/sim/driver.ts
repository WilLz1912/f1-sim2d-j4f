// Lab driver: follows the real racing line at the speeds of the QSS plan. Steering = curvature feed-forward +
// heading and lateral-error feedback + yaw-rate damping. Pedals = reach the planned speed a little ahead; throttle and
// brake are eased off when a wheel starts to slide, the way a driver catches wheelspin or a lock-up.
// This is the base for the if-else AI drivers (M3): it only reads what a driver could know.
import type { Profile } from "./qss";
import type { TrackModel } from "./track";
import { tyreCap, type Controls, type Vehicle } from "./vehicle";

/** How the driver drives (the M3 AI drivers will differ here). */
export interface DriverSkill { traction: number; speedGain: number; lookAhead: number }
export const DEFAULT_SKILL: DriverSkill = { traction: 0.96, speedGain: 3.0, lookAhead: 0.08 };

export class LabDriver {
  li = -1; ey = 0; private thrCap = 1; private brkCap = 1;
  constructor(readonly trk: TrackModel, public prof: Profile, public skill: DriverSkill = { ...DEFAULT_SKILL }) {}

  /** The team's energy map, trimmed when the store is below the plan (the car never follows the plan exactly). */
  kTarget(car: Vehicle, li: number) {
    const k = this.prof.kp[li]; if (k <= 0) return k;
    const deficit = this.prof.soc[li] - car.soc;
    return k * Math.max(0, Math.min(1, 1 - (deficit - 0.15e6) / 0.4e6));
  }

  control(car: Vehicle, dt: number): Controls {
    const trk = this.trk, n = trk.ln, v = Math.max(car.vx, 0);
    if (this.li < 0) { let bd = Infinity; for (let k = 0; k < n; k++) { const d = (trk.lx[k] - car.x) ** 2 + (trk.ly[k] - car.y) ** 2; if (d < bd) { bd = d; this.li = k; } } }
    else this.li = trk.linePoint(car.x, car.y, this.li);
    const li = this.li, h = trk.lh[li];
    const ey = -(car.x - trk.lx[li]) * Math.sin(h) + (car.y - trk.ly[li]) * Math.cos(h);
    this.ey = ey;
    let eh = car.psi - h; eh = Math.atan2(Math.sin(eh), Math.cos(eh));
    const at = (sec: number) => (li + Math.round(v * sec / trk.lds) + 1) % n;
    const kp = trk.lk[at(0.12)];
    const p = car.p;
    let delta = Math.atan(p.wb * kp) - 0.9 * eh - Math.atan(1.6 * ey / (v + 3)) + 0.12 * (v * kp - car.r);
    // catching a slide: steer into it beyond the normal body slip, and damp extra rotation hard
    // (only once the rear tyres are past their peak slip: normal cornering is left alone)
    const beta = Math.atan2(car.vy, Math.max(v, 3)), aR = (car.w[2].alpha + car.w[3].alpha) / 2;
    const over = Math.max(0, Math.abs(aR) / p.tyre.aPeak - 1);
    if (over > 0 && v > 8) { const rRef = v * kp; delta += Math.sign(beta) * 1.5 * over * p.tyre.aPeak - 0.25 * Math.min(1, over * 3) * (car.r - rRef); }
    // no point steering past the front tyres' peak slip: a driver feels the wheel go light
    if (v > 8) { const bF = Math.atan2(car.vy + car.r * p.a, v), lim = 1.15 * p.tyre.aPeak; delta = Math.max(bF - lim, Math.min(bF + lim, delta)); }
    // --- pedals
    // planned acceleration a moment ahead (feed-forward) + speed error feedback
    const pv = this.prof.v, ka = at(this.skill.lookAhead), kb = (ka + 1) % n, vt = pv[at(this.skill.lookAhead + 0.02)], vNow = pv[li];
    const aPlan = (pv[kb] * pv[kb] - pv[ka] * pv[ka]) / (2 * trk.lds);
    const aCmd = aPlan + this.skill.speedGain * (vt - v);
    const drag = 0.5 * p.rho * v * v * (car.modeX ? p.aeroX.cda : p.aeroZ.cda);
    let thr = 0, brk = 0;
    if (this.prof.full[li] && v < vNow + 0.5) thr = 1;
    else if (aCmd >= 0) {
      const fMax = p.pt.eta * (p.pt.ice + (this.prof.kp[li] > 1 ? car.kMax(v) : 0)) / Math.max(v, 4);
      thr = Math.max(0, Math.min(1, (aCmd * p.mass + drag + 0.012 * p.mass * 9.81) / fMax));
    } else brk = Math.max(0, Math.min(1, (-aCmd * p.mass - drag) / p.brake.maxF));
    // catch slides: wheelspin -> lift, lock-up -> release, then come back progressively
    const w = car.w;
    const rearUse = Math.max(w[2].use, w[3].use);
    if (w[2].slide || w[3].slide || rearUse > 0.985 || over > 0.15) this.thrCap = Math.max(0.15, this.thrCap - 4 * dt); else this.thrCap = Math.min(1, this.thrCap + 1.5 * dt);
    if (w[0].slide || w[1].slide) this.brkCap = Math.max(0.3, this.brkCap - 5 * dt); else this.brkCap = Math.min(1, this.brkCap + 2 * dt);
    // feel for the rear: ask only for the drive force the rear tyres have left after the side force the corner needs
    if (thr > 0 && v > 5) {
      const caps = [2, 3].map(k => (w[k].use > 0.01 ? Math.hypot(w[k].fx, w[k].fy) / w[k].use : tyreCap(p, w[k].fz))), cs = caps[0] + caps[1];
      const fyNeed = p.mass * Math.max(Math.abs(car.ayf), v * v * Math.abs(trk.lk[li])) * p.a / p.wb;
      let avail = 0; for (const c of caps) avail += Math.sqrt(Math.max(0, c * c - (fyNeed * c / cs) ** 2));
      const fFull = p.pt.eta * (p.pt.ice + (this.prof.kp[li] > 1 ? car.kMax(v) : 0)) / Math.max(v, 4);
      thr = Math.min(thr, Math.max(0.05, this.skill.traction * avail / fFull));
    }
    thr = Math.min(thr, this.thrCap); brk = Math.min(brk, this.brkCap);
    const modeX = !!this.prof.modeX[li] && thr > 0.98 && brk === 0;
    return { steer: delta / p.steer.max, throttle: thr, brake: brk, kTarget: this.kTarget(car, li), modeX };   // the team's energy map
  }
}
