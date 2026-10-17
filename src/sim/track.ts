// Track model for the physics: centreline stations, real racing line, elevation, Straight Mode zones and the 0.5 m
// surface map. No DOM: the surface map arrives as a Uint8Array (browser: canvas, Node: tools/physics/node-load.ts).

export interface TrackJson {
  length_m: number;
  stations: { ds: number; count: number; x: number[]; y: number[]; w_left: number[]; w_right: number[]; z?: number[] };
  straight_mode: { name: string; from: number; to: number }[];
  racing_line: { offset: number[] }; racing_line_sim?: { offset: number[] };
  lines: { id: string; s: number }[];
  corners: { n: number; name: string; dir: string; apex_s: number; official_s: number }[];
  energy_fia?: { reduction_rate_kw_s: number; reduction_free: { from: number; to: number; quali_only: boolean }[] };
  surface: { file: string; res_m: number; x0: number; y1: number; w: number; h: number; codes: Record<string, number> };
}
export interface SurfaceGrid { data: Uint8Array; w: number; h: number; x0: number; y1: number; res: number }

/** Surface codes of surface.png (track.json -> surface.codes). */
export const SURF = { none: 0, track: 1, kerb: 2, asphalt: 3, paint: 4, grass: 5, gravel: 6, pit: 7, barrier: 8, building: 9, dirt: 10, obstacle: 11 } as const;
/** Grip relative to the racing surface, and extra rolling drag (fraction of the wheel load). Estimates: no public
 *  friction data for Barcelona's run-off; ratios follow typical motorsport values (wet-grass-like grass, gravel
 *  traps built to stop cars). */
export const SURF_GRIP = [0.5, 1.0, 0.92, 0.95, 0.85, 0.45, 0.4, 0.95, 1.0, 1.0, 0.5, 0.5];
export const SURF_DRAG = [0.02, 0, 0, 0, 0, 0.04, 0.25, 0, 0, 0, 0.06, 0.06];
export const isSolid = (c: number) => c === SURF.barrier || c === SURF.building || c === SURF.obstacle;

const gauss = (a: Float64Array, sigma: number) => {           // periodic gaussian smoothing
  const n = a.length, r = Math.ceil(3 * sigma), w: number[] = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
  const sw = w.reduce((p, q) => p + q, 0), out = new Float64Array(n);
  for (let i = 0; i < n; i++) { let acc = 0; for (let k = -r; k <= r; k++) acc += a[(i + k + n) % n] * w[k + r]; out[i] = acc / sw; }
  return out;
};

export class TrackModel {
  readonly n: number; readonly ds: number; readonly L: number;
  readonly cx: Float64Array; readonly cy: Float64Array; readonly nx: Float64Array; readonly ny: Float64Array;
  readonly wl: Float64Array; readonly wr: Float64Array;
  readonly z: Float64Array; readonly grade: Float64Array; readonly kv: Float64Array;   // sin(slope), vertical curvature 1/m
  readonly straightMode: Uint8Array;
  readonly freeCut: Uint8Array; readonly freeCutQ: Uint8Array; readonly reductionRate: number;   // FIA PU power reduction windows, kW/s
  // racing line resampled at uniform arc length
  readonly ln: number; readonly lds: number; readonly lineL: number;
  readonly lx: Float64Array; readonly ly: Float64Array; readonly lk: Float64Array; readonly lh: Float64Array;
  readonly lsc: Float64Array;                                      // centreline s of each line point
  constructor(readonly T: TrackJson, readonly surf: SurfaceGrid | null) {
    const st = T.stations; const n = (this.n = st.count); this.ds = st.ds; this.L = T.length_m;
    this.cx = Float64Array.from(st.x); this.cy = Float64Array.from(st.y); this.wl = Float64Array.from(st.w_left); this.wr = Float64Array.from(st.w_right);
    this.nx = new Float64Array(n); this.ny = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = (i - 1 + n) % n, b = (i + 1) % n, tx = st.x[b] - st.x[a], ty = st.y[b] - st.y[a], l = Math.hypot(tx, ty);
      this.nx[i] = -ty / l; this.ny[i] = tx / l;                 // left normal
    }
    this.z = Float64Array.from(st.z ?? new Array(n).fill(0));
    const zs = gauss(this.z, 10); this.grade = new Float64Array(n); this.kv = new Float64Array(n);
    for (let i = 0; i < n; i++) this.grade[i] = (zs[(i + 1) % n] - zs[(i - 1 + n) % n]) / (2 * this.ds);
    const g2 = gauss(this.grade, 10);
    for (let i = 0; i < n; i++) this.kv[i] = (g2[(i + 1) % n] - g2[(i - 1 + n) % n]) / (2 * this.ds);
    this.straightMode = new Uint8Array(n);
    for (const zn of T.straight_mode) {
      const a = Math.round(zn.from / this.ds), b = Math.round(zn.to / this.ds), len = (b - a + n) % n;
      for (let k = 0; k <= len; k++) this.straightMode[(a + k) % n] = 1;
    }
    this.freeCut = new Uint8Array(n); this.freeCutQ = new Uint8Array(n); this.reductionRate = T.energy_fia?.reduction_rate_kw_s ?? 100;
    for (const w of T.energy_fia?.reduction_free ?? []) for (let i = Math.round(w.from / this.ds); i <= Math.round(w.to / this.ds) && i < n; i++) {
      this.freeCutQ[i] = 1; if (!w.quali_only) this.freeCut[i] = 1;
    }
    // racing line: centreline + offset, resampled to uniform spacing, curvature smoothed over ~5 m
    const off = (T.racing_line_sim ?? T.racing_line).offset, px: number[] = [], py: number[] = [], cum = [0];
    for (let i = 0; i < n; i++) { px.push(st.x[i] + off[i] * this.nx[i]); py.push(st.y[i] + off[i] * this.ny[i]); }
    for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(px[i % n] - px[i - 1], py[i % n] - py[i - 1]));
    this.lineL = cum[n]; const ln = (this.ln = n); this.lds = this.lineL / ln;
    this.lx = new Float64Array(ln); this.ly = new Float64Array(ln); this.lsc = new Float64Array(ln);
    let j = 0;
    for (let k = 0; k < ln; k++) {
      const s = k * this.lds; while (cum[j + 1] < s) j++;
      const f = (s - cum[j]) / (cum[j + 1] - cum[j]), j1 = (j + 1) % n;
      this.lx[k] = px[j] + f * (px[j1] - px[j]); this.ly[k] = py[j] + f * (py[j1] - py[j]); this.lsc[k] = (j + f) * this.ds;
    }
    this.lh = new Float64Array(ln); const kr = new Float64Array(ln);
    for (let k = 0; k < ln; k++) { const a = (k - 1 + ln) % ln, b = (k + 1) % ln; this.lh[k] = Math.atan2(this.ly[b] - this.ly[a], this.lx[b] - this.lx[a]); }
    for (let k = 0; k < ln; k++) { let d = this.lh[(k + 1) % ln] - this.lh[(k - 1 + ln) % ln]; d = Math.atan2(Math.sin(d), Math.cos(d)); kr[k] = d / (2 * this.lds); }
    this.lk = gauss(kr, 5);
  }
  /** Nearest centreline station, searching around `hint` first (cheap), globally if the hint is far off. */
  station(x: number, y: number, hint = -1): number {
    const n = this.n; let best = -1, bd = Infinity;
    if (hint >= 0) {
      for (let k = -40; k <= 40; k++) { const i = (hint + k + n) % n, d = (this.cx[i] - x) ** 2 + (this.cy[i] - y) ** 2; if (d < bd) { bd = d; best = i; } }
      if (bd < 900) return best;
    }
    for (let i = 0; i < n; i++) { const d = (this.cx[i] - x) ** 2 + (this.cy[i] - y) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  /** Lateral offset from the centreline at station i (+ = left). */
  offset(i: number, x: number, y: number) { return (x - this.cx[i]) * this.nx[i] + (y - this.cy[i]) * this.ny[i]; }
  /** Nearest racing-line point around hint (line index). */
  linePoint(x: number, y: number, hint: number): number {
    const n = this.ln; let best = hint, bd = Infinity;
    for (let k = -30; k <= 60; k++) { const i = (hint + k + n) % n, d = (this.lx[i] - x) ** 2 + (this.ly[i] - y) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  surface(x: number, y: number): number {
    const S = this.surf; if (!S) return SURF.track;
    const c = Math.floor((x - S.x0) / S.res), r = Math.floor((S.y1 - y) / S.res);
    if (c < 0 || r < 0 || c >= S.w || r >= S.h) return SURF.none;
    return S.data[r * S.w + c];
  }
  sAt(id: string) { return this.T.lines.find(l => l.id === id)!.s; }
}
