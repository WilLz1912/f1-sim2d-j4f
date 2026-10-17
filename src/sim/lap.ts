// Headless flying lap: the lab driver takes the car from `startS` (before the control line, at the planned speed),
// the timed lap runs control line to control line. The energy store is full and the harvest counter reset when the
// timed lap starts (quali: teams charge on the out-lap). Result is sampled every 5 m like data/telemetry.
import type { CarParams } from "./car";
import { LabDriver, type DriverSkill } from "./driver";
import { plan, type PlanOpts, type Profile } from "./qss";
import type { TrackModel } from "./track";
import { Vehicle } from "./vehicle";

export const DT = 1 / 500;
/** The plan the lab driver races to: 100 % of the grip, the team's energy map. */
export const labPlan = (p: CarParams): PlanOpts => ({ grip: 1, brakeGrip: 1, energy: p.energyMap });
export interface LapResult {
  time: number; sectors: number[]; crashed: boolean; maxOff: number;
  v: number[]; thr: number[]; brk: number[]; gear: number[]; t: number[]; soc: number[]; off: number[]; plan: number[];   // per 5 m
  deployJ: number; harvestJ: number; profile: Profile;
}

export function flyingLap(trk: TrackModel, p: CarParams, o: PlanOpts = labPlan(p), startS = 3900, skill?: Partial<DriverSkill>, profIn?: Profile): LapResult {
  const prof = profIn ?? plan(trk, p, o), car = new Vehicle(p, trk), drv = new LabDriver(trk, prof);
  if (skill) Object.assign(drv.skill, skill);
  let k0 = 0; while (trk.lsc[k0] < startS) k0++;
  car.place(trk.lx[k0], trk.ly[k0], trk.lh[k0], prof.v[k0]);
  const N = Math.floor(trk.L / 5), out: LapResult = { time: NaN, sectors: [], crashed: false, maxOff: 0, v: [], thr: [], brk: [], gear: [], t: [], soc: [], off: [], plan: [],
    deployJ: 0, harvestJ: 0, profile: prof };
  const s1 = trk.sAt("sector1"), s2 = trk.sAt("sector2");
  let t = 0, timing = false, tStart = 0, prevS = car.s, nextBin = 0;
  for (let step = 0; step < 200 / DT; step++) {
    const c = drv.control(car, DT); car.step(DT, c); t += DT;
    if (car.crashed) { out.crashed = true; break; }
    const s = car.s;
    if (!timing && prevS > trk.L - 200 && s < 200) { timing = true; tStart = t; car.soc = p.pt.esJ; car.harvestedLap = 0; car.deployedLap = 0; }
    else if (timing) {
      if (prevS < s1 && s >= s1 && out.sectors.length === 0) out.sectors.push(t - tStart);
      if (prevS < s2 && s >= s2 && out.sectors.length === 1) out.sectors.push(t - tStart);
      while (nextBin < N && s >= nextBin * 5 && s < trk.L - 100) {
        out.v.push(car.vx * 3.6); out.thr.push(c.throttle * 100); out.brk.push(c.brake * 100); out.gear.push(car.gear); out.t.push(t - tStart); out.soc.push(car.soc / 1e6); out.off.push(drv.ey); out.plan.push(prof.v[drv.li] * 3.6);
        nextBin++;
      }
      out.maxOff = Math.max(out.maxOff, Math.abs(car.off) - (car.off > 0 ? trk.wl[car.idx] : trk.wr[car.idx]));
      if (prevS > trk.L - 200 && s < 200) {
        out.time = t - tStart; out.sectors.push(out.time - out.sectors[1]); out.sectors[1] -= out.sectors[0];
        while (out.v.length < N) { out.v.push(car.vx * 3.6); out.thr.push(c.throttle * 100); out.brk.push(c.brake * 100); out.gear.push(car.gear); out.t.push(out.time); out.soc.push(car.soc / 1e6); out.off.push(drv.ey); out.plan.push(prof.v[drv.li] * 3.6); }
        out.deployJ = car.deployedLap; out.harvestJ = car.harvestedLap; break;
      }
    }
    prevS = s;
  }
  return out;
}
