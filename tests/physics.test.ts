// Physics core sanity: determinism, FIA energy rules, plausible straight-line numbers, calibration against the real
// Barcelona 2026 Q lap. Run: npm test
import { describe, it, expect } from "vitest";
import { loadTrack, loadCars, loadTelemetry } from "../tools/physics/node-load";
import { flyingLap } from "../src/sim/lap";
import { Vehicle } from "../src/sim/vehicle";
import type { TrackModel } from "../src/sim/track";

const trk = loadTrack(), C = loadCars(), tel = loadTelemetry();
const flat = { station: () => 0, offset: () => 0, ds: 1, grade: [0], kv: [0], surface: () => 1, freeCut: [1], freeCutQ: [1], reductionRate: 100 } as unknown as TrackModel;

describe("vehicle on flat ground", () => {
  const p = C.build("mercedes");
  it("top speed is capped by the FIA MGU-K curve (0 kW at 355 km/h) and drag", () => {
    const car = new Vehicle(p, flat); car.place(0, 0, 0, 40);
    for (let i = 0; i < 40 * 500; i++) car.step(1 / 500, { steer: 0, throttle: 1, brake: 0, kTarget: 350e3, modeX: true });
    expect(car.vx * 3.6).toBeGreaterThan(320); expect(car.vx * 3.6).toBeLessThan(356);
  });
  it("brakes from 300 to 100 km/h in a plausible distance", () => {
    const car = new Vehicle(p, flat); car.place(0, 0, 0, 300 / 3.6); car.soc = 0;
    let x0 = car.x, i = 0;
    for (; car.vx > 100 / 3.6 && i < 10 * 500; i++) car.step(1 / 500, { steer: 0, throttle: 0, brake: 0.9, kTarget: 0, modeX: false });
    const d = car.x - x0;                    // real F1 (2025): ~80-110 m; 2026 cars have less downforce
    expect(d).toBeGreaterThan(70); expect(d).toBeLessThan(170);
  });
});

describe("flying lap, Mercedes vs Russell's 2026 pole lap", () => {
  const p = C.build("mercedes"), a = flyingLap(trk, p), b = flyingLap(trk, p), ref = tel.drivers.RUS;
  it("is deterministic", () => { expect(a.time).toBe(b.time); expect(a.v).toEqual(b.v); });
  it("stays on track and finishes", () => { expect(a.crashed).toBe(false); expect(a.maxOff).toBeLessThan(1.5); });
  it("respects the FIA energy limits", () => {
    expect(a.harvestJ).toBeLessThanOrEqual(p.pt.harvestLapJ + 1);
    expect(Math.min(...a.soc)).toBeGreaterThanOrEqual(0); expect(Math.max(...a.soc)).toBeLessThanOrEqual(p.pt.esJ / 1e6 + 1e-9);
  });
  it("matches the real lap time within 0.3 s and the speed trace within 14 km/h RMS", () => {
    expect(Math.abs(a.time - ref.lap)).toBeLessThan(0.3);
    let se = 0; for (let i = 0; i < a.v.length; i++) se += (a.v[i] - ref.v[i]) ** 2;
    expect(Math.sqrt(se / a.v.length)).toBeLessThan(14);
  });
});
