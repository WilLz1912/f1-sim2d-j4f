// Car parameters for the physics, built from data/cars/cars_2026.json (team specs, 2026 rules), gearing_2026.json
// (gear ratios measured from OpenF1 speed/rpm) and physics_2026.json (values fitted to real laps). Every number not
// coming from those files is marked "estimate" here.

export interface CarsJson {
  regs: Record<string, any>;
  teams: Record<string, { mass_kg: { v: number }; wheelbase_mm: { v: number };
    physics: { cog_height_m: number; front_weight_frac: number; yaw_inertia_kgm2: number; track_front_mm: number; track_rear_mm: number;
      aero_Z: { ClA_m2: number; CdA_m2: number; front_frac: number }; aero_X: { ClA_m2: number; CdA_m2: number; front_frac: number } } }>;
}
export interface GearingJson { teams: Record<string, { v_per_rpm_ms: Record<string, number>; upshift_rpm: number }> }
/** Fitted values per team (and "_base" for the shared tyre model). Any subset of FitValues. */
export interface PhysicsJson { base: Partial<FitValues>; teams: Record<string, Partial<FitValues> & { kmap?: number[] }> }
/** Spacing (m of centreline) of a team's MGU-K map in physics_2026.json. */
export const KMAP_STEP = 25;
export interface FitValues { mu: number; sens: number; claZ: number; cdaZ: number; claX: number; cdaX: number; ice: number; fuel: number; bal: number; clip: number; dClip: number; muX: number }

export interface Aero { cla: number; cda: number; front: number }
export interface CarParams {
  team: string;
  mass: number; wb: number; a: number; b: number; h: number; tf: number; tr: number; izz: number; rollF: number;
  rho: number; aeroZ: Aero; aeroX: Aero;
  tyre: { mu: number; fz0: number; sens: number; aPeak: number; drop: number; muX: number; crr: number; slide: number };
  // the team's MGU-K map: either a measured map (kW every KMAP_STEP m: + deploy, - harvest at full throttle, inferred
  // from the real lap) or the simple rule "clip `clip` W over the last dClip m before braking"
  energyMap: { clip: number; dClip: number; kmap: number[] | null };
  pt: { session: "quali" | "race"; ice: number; rpmFull: number; rpmMax: number; kCurve: [number, number][]; kHarvest: number; esJ: number; harvestLapJ: number;
    vpr: number[]; upRpm: number; downRpm: number; eta: number; etaK: number };
  brake: { maxF: number; balF: number };
  steer: { max: number; rate: number };
}

/** MGU-K maximum DC power (kW) vs car speed (km/h), FIA Barcelona 2026 PU information, Art. C5.2.8, read off the
 *  vector chart in the PDF. Qualifying and practice use "Base - Overtake". */
export const K_CURVES: Record<string, [number, number][]> = {
  baseStandard: [[0, 350], [290, 350], [340, 100], [345, 0]],
  baseOvertake: [[0, 350], [337.5, 350], [340, 300], [345, 200], [355, 0]],
  alt1: [[0, 250], [310, 250], [340, 100], [345, 0]],
};
export const kLimit = (curve: [number, number][], vKmh: number) => {
  if (vKmh <= curve[0][0]) return curve[0][1] * 1000;
  for (let i = 1; i < curve.length; i++) if (vKmh <= curve[i][0]) {
    const [x0, y0] = curve[i - 1], [x1, y1] = curve[i]; return (y0 + (y1 - y0) * (vKmh - x0) / (x1 - x0)) * 1000;
  }
  return curve[curve.length - 1][1] * 1000;
};

/** Defaults before fitting. mu/sens/B/C/E: estimates for 2026 slicks; aero from cars_2026.json (estimates). */
export const DEFAULT_FIT: FitValues = { mu: 1.75, sens: 0.12, claZ: 3.6, cdaZ: 1.05, claX: 1.6, cdaX: 0.62, ice: 400, fuel: 8, bal: 0.45, clip: 200, dClip: 300, muX: 1 };   // bal: aero front share = static weight front share (neutral car), estimate

export function buildCar(team: string, cars: CarsJson, gearing: GearingJson, fit?: PhysicsJson, session: "quali" | "race" = "quali"): CarParams {
  const t = cars.teams[team], ph = t.physics, f: FitValues = { ...DEFAULT_FIT, ...(fit?.base ?? {}), ...(fit?.teams[team] ?? {}) };
  const wb = t.wheelbase_mm.v / 1000, wf = ph.front_weight_frac;
  // gear ratios (m/s per rpm) measured for gears 3/4..8; the lowest gears are never used at Barcelona in Q, so they
  // continue the measured geometric step (estimate).
  const g = gearing.teams[team], vpr: number[] = [];
  for (let k = 1; k <= 8; k++) vpr[k] = g.v_per_rpm_ms[String(k)] ?? NaN;
  for (let k = 7; k >= 1; k--) if (isNaN(vpr[k])) vpr[k] = vpr[k + 1] * (vpr[k + 1] / vpr[k + 2]);
  return {
    team, mass: t.mass_kg.v + f.fuel, wb, a: wb * (1 - wf), b: wb * wf, h: ph.cog_height_m, tf: ph.track_front_mm / 1000, tr: ph.track_rear_mm / 1000,
    izz: ph.yaw_inertia_kgm2, rollF: 0.58,                                       // roll stiffness share at the front (mild understeer at the limit): estimate
    rho: 1.18,                                                                    // air density, Barcelona June ~27 C, 110 m: estimate
    aeroZ: { cla: f.claZ, cda: f.cdaZ, front: f.bal }, aeroX: { cla: f.claX, cda: f.cdaX, front: f.bal },
    tyre: { mu: f.mu, fz0: 3000, sens: f.sens, aPeak: 0.09, drop: 0.08, muX: f.muX, crr: 0.012, slide: 0.8 },   // peak slip ~5 deg, mild fall-off: estimates
    energyMap: { clip: f.clip * 1000, dClip: f.dClip, kmap: fit?.teams[team]?.kmap ?? null },
    pt: { session, ice: f.ice * 1000, rpmFull: 10500, rpmMax: 12500, kCurve: session === "quali" ? K_CURVES.baseOvertake : K_CURVES.baseStandard,
      kHarvest: 350e3, esJ: 4e6, harvestLapJ: (session === "quali" ? 7.0 : 8.5) * 1e6,     // FIA Barcelona 2026 PU information
      vpr, upRpm: g.upshift_rpm, downRpm: 8500, eta: 0.95, etaK: 0.95 },
    brake: { maxF: 48000, balF: 0.57 },                                            // estimates
    steer: { max: 0.30, rate: 1.6 },                                               // road-wheel lock (rad) and rate: estimates
  };
}
