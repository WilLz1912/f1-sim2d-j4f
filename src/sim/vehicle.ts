// Planar two-track vehicle model, fixed step. Body frame: x forward, y left, yaw counter-clockwise.
// - Normal loads: weight on the slope + vertical curvature, aero (front/rear split per mode), longitudinal and lateral
//   load transfer from the (filtered) accelerations.
// - Tyres: Pacejka lateral curve, load-sensitive friction, friction ellipse for combined slip; a wheel asked for more
//   longitudinal force than it has slides (wheelspin / lock-up) and keeps only a little side force.
// - Powertrain: ICE + MGU-K (FIA speed curve), 8 gears measured from telemetry, energy store and per-lap harvest limit.
// - Surface under each wheel from the 0.5 m map: grip and drag of kerbs, grass, gravel; barriers stop the car.
import type { CarParams } from "./car";
import { kLimit } from "./car";
import { TrackModel, SURF_GRIP, SURF_DRAG, isSolid } from "./track";

export interface Controls {
  steer: number;      // -1..1, + = left
  throttle: number;   // 0..1
  brake: number;      // 0..1
  kTarget: number;    // MGU-K power wanted (W): + deploy (scaled by throttle), - harvest at full throttle ("super clipping")
  modeX: boolean;     // Straight Mode (low-drag wings)
}
export const G = 9.81;
/** Side force / peak vs slip angle / peak slip angle: parabola up to the peak, then a gentle fall-off by `drop`. */
export function latCurve(x: number, drop: number) {
  const a = Math.abs(x), f = a <= 1 ? a * (2 - a) : 1 - drop * (1 - Math.exp(-(a - 1) / 1.5));
  return x < 0 ? -f : f;
}

/** Normal load of each wheel (FL FR RL RR): weight on the slope + vertical curvature, aero, load transfer from the
 *  accelerations ax, ay (m/s^2, body frame). Shared by the dynamic model and the driver's plan. */
export function wheelLoads(p: CarParams, aero: { cla: number; front: number }, v: number, sinG: number, kv: number, ax: number, ay: number, out: number[]) {
  const v2 = v * v, down = 0.5 * p.rho * v2 * aero.cla, W = p.mass * (G * Math.sqrt(1 - sinG * sinG) + v2 * kv);
  const dLong = p.mass * ax * p.h / p.wb, fzF = W * p.b / p.wb + down * aero.front - dLong, fzR = W * p.a / p.wb + down * (1 - aero.front) + dLong;
  const dLat = p.mass * ay * p.h, dF = dLat * p.rollF / p.tf, dR = dLat * (1 - p.rollF) / p.tr;
  out[0] = Math.max(0, fzF / 2 - dF); out[1] = Math.max(0, fzF / 2 + dF); out[2] = Math.max(0, fzR / 2 - dR); out[3] = Math.max(0, fzR / 2 + dR);
  return out;
}
/** Peak friction force of a tyre at load fz (load sensitivity). */
export const tyreCap = (p: CarParams, fz: number) => p.tyre.mu * Math.max(0.6, 1 - p.tyre.sens * (fz / p.tyre.fz0 - 1)) * fz;

export class Wheel {
  fz = 0; fx = 0; fy = 0; alpha = 0; use = 0; slide = false; surf = 1;
}

export class Vehicle {
  x = 0; y = 0; psi = 0; vx = 0; vy = 0; r = 0; delta = 0;
  ax = 0; ay = 0; axf = 0; ayf = 0;
  gear = 1; rpm = 4000; soc: number; harvestedLap = 0; deployedLap = 0;
  pIce = 0; pK = 0; modeX = false; crashed = false;
  idx = -1; s = 0; off = 0;                                   // centreline station, distance, lateral offset
  readonly w = [new Wheel(), new Wheel(), new Wheel(), new Wheel()];   // FL FR RL RR
  private fz = [0, 0, 0, 0];
  constructor(readonly p: CarParams, readonly trk: TrackModel) { this.soc = p.pt.esJ; }

  place(x: number, y: number, psi: number, v: number) {
    this.x = x; this.y = y; this.psi = psi; this.vx = v; this.vy = 0; this.r = 0; this.delta = 0; this.crashed = false;
    this.ax = this.ay = this.axf = this.ayf = 0;
    this.idx = this.trk.station(x, y); this.s = this.idx * this.trk.ds;
    this.gear = 8; while (this.gear > 1 && v / this.p.pt.vpr[this.gear - 1] < this.p.pt.upRpm * 0.97) this.gear--;
  }
  get speed() { return Math.hypot(this.vx, this.vy); }
  /** Rear-axle tractive force the tyres can carry now (driver "feel" for throttle control). */
  rearGripX() { const a = this.w[2], b = this.w[3]; return this.p.tyre.mu * (this.muScale(a.fz) * a.fz * SURF_GRIP[a.surf] + this.muScale(b.fz) * b.fz * SURF_GRIP[b.surf]); }
  muScale(fz: number) { const t = this.p.tyre; return Math.max(0.6, 1 - t.sens * (fz / t.fz0 - 1)); }
  kMax(v: number) { return kLimit(this.p.pt.kCurve, v * 3.6); }

  step(dt: number, c: Controls) {
    const p = this.p, t = p.tyre, trk = this.trk;
    if (this.crashed) { this.vx = this.vy = this.r = 0; return; }
    // --- where are we
    this.idx = trk.station(this.x, this.y, this.idx); this.s = this.idx * trk.ds; this.off = trk.offset(this.idx, this.x, this.y);
    const sinG = trk.grade[this.idx], kv = trk.kv[this.idx];
    const cs = Math.cos(this.psi), sn = Math.sin(this.psi);
    const pos = [[p.a, p.tf / 2], [p.a, -p.tf / 2], [-p.b, p.tr / 2], [-p.b, -p.tr / 2]];
    for (let k = 0; k < 4; k++) {
      const wx = this.x + pos[k][0] * cs - pos[k][1] * sn, wy = this.y + pos[k][0] * sn + pos[k][1] * cs;
      const sc = trk.surface(wx, wy); this.w[k].surf = sc;
      if (isSolid(sc) && this.speed > 1) { this.crashed = true; this.vx = this.vy = this.r = 0; return; }
    }
    // --- steering (rate-limited)
    const dTarget = Math.max(-1, Math.min(1, c.steer)) * p.steer.max, dMax = p.steer.rate * dt;
    this.delta += Math.max(-dMax, Math.min(dMax, dTarget - this.delta));
    // --- aero and normal loads
    const vx = this.vx, v2 = vx * vx;
    this.modeX = c.modeX; const aero = c.modeX ? p.aeroX : p.aeroZ;
    const drag = 0.5 * p.rho * v2 * aero.cda * Math.sign(vx);
    const fz = this.fz; wheelLoads(p, aero, vx, sinG, kv, this.axf, this.ayf, fz);
    // --- powertrain
    const pt = p.pt, vpr = pt.vpr;
    if (this.gear < 8 && vx / vpr[this.gear] > pt.upRpm) this.gear++;
    else if (this.gear > 1 && vx / vpr[this.gear - 1] < pt.downRpm) this.gear--;
    this.rpm = Math.max(4000, vx / vpr[this.gear]);
    const thr = Math.max(0, Math.min(1, c.throttle)), brk = Math.max(0, Math.min(1, c.brake));
    const rpmF = this.rpm < pt.rpmFull ? this.rpm / pt.rpmFull : this.rpm > pt.rpmMax ? Math.max(0, 1 - (this.rpm - pt.rpmMax) / 800) : 1;
    const harvestRoom = Math.max(0, Math.min(pt.harvestLapJ - this.harvestedLap, pt.esJ - this.soc));
    // Power split: the pedal asks for a share of (ICE + allowed deploy). The ICE runs at full load whenever the pedal
    // is pressed; the MGU-K makes up the difference: deploys above the ICE, harvests below it (part-throttle
    // harvesting). Clip zones force harvesting at full throttle. At full throttle a K reduction is limited to
    // 100 kW/s outside the FIA windows. No energy room or no charge left -> the ICE alone follows the pedal.
    const iceMax = pt.ice * rpmF;
    let pK = 0; this.pIce = 0;
    if (thr > 0.02 && brk === 0) {
      const kDep = c.kTarget > 0 && this.soc > 0 ? Math.min(c.kTarget, this.kMax(vx)) : 0;
      const req = thr * (iceMax + kDep);
      let target = c.kTarget < 0 && thr > 0.95 ? Math.max(c.kTarget, -pt.kHarvest) : Math.max(-pt.kHarvest, Math.min(kDep, req - iceMax));
      if (target < 0 && harvestRoom <= 0) target = 0;
      const free = (pt.session === "quali" ? trk.freeCutQ : trk.freeCut)[this.idx];
      if (thr > 0.95 && target < this.pK && !free) target = Math.max(target, this.pK - trk.reductionRate * 1000 * dt);
      pK = Math.min(target, this.soc > 0 ? this.kMax(vx) : 0);
      this.pIce = pK < 0 || pK >= kDep * 0.999 ? iceMax : Math.max(0, req - pK);
      if (pK >= 0 && req < iceMax) this.pIce = req;              // nothing to harvest into: ICE follows the pedal
    }
    // regenerative braking on the rear axle, the rest is friction braking (brake-by-wire keeps the total)
    const fBrake = brk * p.brake.maxF, fBrakeR = fBrake * (1 - p.brake.balF);
    let pRegen = 0;
    if (brk > 0 && harvestRoom > 0) { pRegen = Math.min(pt.kHarvest, fBrakeR * Math.max(vx, 0)); pK = 0; }
    this.pK = pK;
    const pWheel = pt.eta * (this.pIce + pK);
    const fDrive = vx > 0.5 ? Math.min(pWheel / Math.max(vx, 4), 26000) : thr * 12000;
    // energy bookkeeping
    if (pK > 0) { this.soc -= pK / pt.etaK * dt; this.deployedLap += pK * dt; }
    const harv = (pK < 0 ? -pK : 0) + pRegen;
    if (harv > 0) { const e = Math.min(harv * pt.etaK * dt, harvestRoom); this.soc += e; this.harvestedLap += e; }
    // --- tyres
    // front brakes: same pressure both sides (the unloaded inside wheel locks first). Rear axle: limited-slip
    // differential + brake-by-wire share the axle force by each wheel's grip.
    const fR = fDrive - fBrakeR, gl = this.muScale(fz[2]) * fz[2] * SURF_GRIP[this.w[2].surf], gr = this.muScale(fz[3]) * fz[3] * SURF_GRIP[this.w[3].surf];
    const shL = gl + gr > 0 ? 0.5 * 0.4 + 0.6 * gl / (gl + gr) : 0.5;
    const fxDem = [-fBrake * p.brake.balF / 2, -fBrake * p.brake.balF / 2, fR * shL, fR * (1 - shL)];
    let Fx = 0, Fy = 0, Mz = 0, roll = 0;
    const cd = Math.cos(this.delta), sd = Math.sin(this.delta);
    for (let k = 0; k < 4; k++) {
      const wh = this.w[k], front = k < 2, xk = pos[k][0], yk = pos[k][1];
      const wvx = this.vx - this.r * yk, wvy = this.vy + this.r * xk;
      const lvx = front ? wvx * cd + wvy * sd : wvx, lvy = front ? -wvx * sd + wvy * cd : wvy;
      const alpha = Math.atan2(lvy, Math.max(Math.abs(lvx), 3));
      const grip = SURF_GRIP[wh.surf], mu = t.mu * this.muScale(fz[k]) * grip, fmax = mu * fz[k];
      const fy0 = -fmax * latCurve(alpha / t.aPeak, t.drop);
      let fx = fxDem[k], fy: number;
      const fxMax = t.muX * fmax;
      if (Math.abs(fx) > fxMax) { fx = Math.sign(fx) * fxMax * t.slide; fy = fy0 * 0.3; wh.slide = true; }
      else { fy = fy0 * Math.sqrt(Math.max(0, 1 - (fx / Math.max(fxMax, 1)) ** 2)); wh.slide = false; }
      if (Math.abs(lvx) < 0.3 && fx < 0) fx = 0;                    // brakes hold, do not push backwards
      wh.fz = fz[k]; wh.fx = fx; wh.fy = fy; wh.alpha = alpha; wh.use = fmax > 0 ? Math.hypot(fx, fy) / fmax : 0;
      const bx = front ? fx * cd - fy * sd : fx, by = front ? fx * sd + fy * cd : fy;
      Fx += bx; Fy += by; Mz += xk * by - yk * bx;
      roll += (t.crr + SURF_DRAG[wh.surf]) * fz[k];
    }
    Fx -= drag + p.mass * G * sinG + roll * Math.sign(vx);
    // --- integrate (semi-implicit Euler)
    const ax = Fx / p.mass, ay = Fy / p.mass;
    this.vx += (ax + this.r * this.vy) * dt; this.vy += (ay - this.r * this.vx) * dt; this.r += Mz / p.izz * dt;
    if (this.vx < 0.5 && brk > 0.05) { this.vx = Math.max(0, this.vx); }
    if (Math.abs(this.vx) < 1) { this.vy *= 0.9; this.r *= 0.9; }
    this.ax = ax; this.ay = ay;
    const kf = Math.min(1, dt / 0.04); this.axf += (ax - this.axf) * kf; this.ayf += (ay - this.ayf) * kf;
    this.psi += this.r * dt;
    const c2 = Math.cos(this.psi), s2 = Math.sin(this.psi);
    this.x += (this.vx * c2 - this.vy * s2) * dt; this.y += (this.vx * s2 + this.vy * c2) * dt;
  }
}
