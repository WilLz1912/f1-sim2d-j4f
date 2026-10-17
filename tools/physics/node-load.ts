// Node loaders for the physics tools: track.json, the surface map (8-bit greyscale PNG, decoded with zlib), car files.
import { readFileSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { TrackModel, type TrackJson, type SurfaceGrid } from "../../src/sim/track";
import { buildCar, type CarsJson, type GearingJson, type PhysicsJson } from "../../src/sim/car";

const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));

/** Minimal PNG decoder for non-interlaced 8-bit greyscale (what build_surface.py writes). */
export function decodeGreyPng(buf: Buffer): { w: number; h: number; data: Uint8Array } {
  let i = 8, w = 0, h = 0; const idat: Buffer[] = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i), type = buf.toString("ascii", i + 4, i + 8);
    if (type === "IHDR") { w = buf.readUInt32BE(i + 8); h = buf.readUInt32BE(i + 12); if (buf[i + 16] !== 8 || buf[i + 17] !== 0) throw new Error("not 8-bit grey"); }
    else if (type === "IDAT") idat.push(buf.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), out = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) {
    const f = raw[r * (w + 1)], src = r * (w + 1) + 1, o = r * w;
    for (let c = 0; c < w; c++) {
      const x = raw[src + c], a = c ? out[o + c - 1] : 0, b = r ? out[o - w + c] : 0, cc = r && c ? out[o - w + c - 1] : 0;
      let v: number;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const pp = a + b - cc, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - cc); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : cc); }
      out[o + c] = v & 255;
    }
  }
  return { w, h, data: out };
}

export function loadTrack(dir = "data/tracks/barcelona/"): TrackModel {
  const T = json(dir + "track.json") as TrackJson, S = T.surface, img = decodeGreyPng(readFileSync(dir + S.file));
  const surf: SurfaceGrid = { data: img.data, w: img.w, h: img.h, x0: S.x0, y1: S.y1, res: S.res_m };
  return new TrackModel(T, surf);
}
export function loadCars() {
  const cars = json("data/cars/cars_2026.json") as CarsJson & { drivers: { code: string; team: string }[] };
  const gearing = json("data/cars/gearing_2026.json") as GearingJson;
  const fit = existsSync("data/cars/physics_2026.json") ? (json("data/cars/physics_2026.json") as PhysicsJson) : undefined;
  return { cars, gearing, fit, build: (team: string, f: PhysicsJson | undefined = fit) => buildCar(team, cars, gearing, f) };
}
export function loadTelemetry() {
  return json("data/telemetry/barcelona_2026_q.json") as { ds: number; n: number; drivers: Record<string, { team: string; lap: number; s1: number; s2: number; s3: number; t: number[]; v: number[]; thr: number[]; brk: number[]; gear: number[] }> };
}
/** Plan speed (km/h) on the telemetry's 5 m centreline bins. */
export function planOnBins(trk: TrackModel, v: Float64Array, nBins: number) {
  const out = new Float64Array(nBins); let k = 0;
  for (let b = 0; b < nBins; b++) { const s = b * 5; while (k < trk.ln - 1 && trk.lsc[k + 1] <= s) k++; out[b] = v[k] * 3.6; }
  return out;
}
