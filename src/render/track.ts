// Track renderer in the V11 look (Argon/Opus palette) on the real 1:1 Barcelona geometry.
// All static shapes are built once as Path2D in world metres; a frame only sets the view transform and fills.

export interface TrackData {
  stations: { ds: number; count: number; x: number[]; y: number[]; w_left: number[]; w_right: number[];
    kerb_left: number[]; kerb_right: number[]; barrier_left: number[]; barrier_right: number[] };
  corners: { n: number; dir: string; apex_s: number }[];
  lines: { id: string; s: number }[];
  straight_mode: { from: number; to: number }[];
  pit: { path: [number, number][]; limit_from: number; limit_to: number; fast_lane_w: number; working_lane_w: number;
    wall_off: number; fast: [number, number]; work: [number, number]; garage_front: number;
    boxes: { team: string; pit_s: number; stop_xy: [number, number]; garage_xy: [number, number] }[] };
  grid: { pos: number; s: number; offset: number; xy: [number, number] }[];
  structures: { kind: string; name: string; pts: [number, number][] }[];
  racing_line?: { offset: number[] };
}
export interface RenderData { domain: number[][][]; asphalt: number[][][]; paint: number[][][]; gravel: number[][][]; trees?: number[][][]; barriers?: number[][] }
export interface View { x: number; y: number; z: number }   // world point at screen centre, pixels per metre
export interface TeamLook { code3: string; body: string }

const COL = {
  bg: "#0b0f14", ground: "#0f2419", building: "#1b2230", buildingEdge: "#2b3546", grandstand: "#25304a", seats: "#34446a", paddock: "#1e2530",
  grass: "#17482c", grassStripe: "#194d2f", tree: "#0e3a22", treeRim: "#14502f",
  asphalt: "#4a525e", paint: "#2c8a62", gravel: "#d2a65e", gravelDot: "#b88c47",
  track: "#2a2e35", groove: "rgba(10,12,16,0.35)", edge: "#f4f6f8", kerbR: "#e23a3a", kerbW: "#f4f6f8",
  tecproW: "#f2f2f2", tecproR: "#d92f2f", barrierEdge: "rgba(0,0,0,0.55)",
  pitFast: "#30363f", pitWork: "#203a7a", pitWall: "#c9ced6", garage: "#121826", garageEdge: "#3b475c",
  straightMode: "rgba(56,189,248,0.10)",
};

export class TrackRenderer {
  private T: TrackData;
  private n: number;
  private nx: Float64Array; private ny: Float64Array;
  private paths: Record<string, Path2D> = {};
  private kerbRed = new Path2D(); private kerbWhite = new Path2D();

  constructor(T: TrackData, R: RenderData, private teams: Record<string, TeamLook> = {}) {
    this.T = T; const st = T.stations; this.n = st.count;
    this.nx = new Float64Array(this.n); this.ny = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++) {
      const a = (i - 1 + this.n) % this.n, b = (i + 1) % this.n;
      const tx = st.x[b] - st.x[a], ty = st.y[b] - st.y[a], l = Math.hypot(tx, ty);
      this.nx[i] = -ty / l; this.ny[i] = tx / l;
    }
    const polys = (rs: number[][][]) => { const p = new Path2D(); for (const poly of rs) for (const ring of poly) ringTo(p, ring); return p; };
    this.paths.domain = polys(R.domain);
    this.paths.infield = new Path2D(); for (const poly of R.domain) ringTo(this.paths.infield, poly[0]);   // outer rings only
    this.paths.asphalt = polys(R.asphalt); this.paths.paint = polys(R.paint); this.paths.gravel = polys(R.gravel); this.paths.trees = polys(R.trees ?? []);
    if (T.racing_line) this.paths.groove = this.offsetPath(i => T.racing_line!.offset[i], true);
    this.grassPat = makePattern(32, (g, s) => { g.fillStyle = COL.grass; g.fillRect(0, 0, s, s); g.fillStyle = COL.grassStripe; g.fillRect(0, 0, s, s / 2); });
    this.gravelPat = makePattern(32, (g, s) => { g.fillStyle = COL.gravel; g.fillRect(0, 0, s, s); g.fillStyle = COL.gravelDot;
      for (let k = 0; k < 40; k++) { const h = Math.imul(k + 1, 2654435761) >>> 0; g.fillRect(h % s, (h >>> 8) % s, 1.5, 1.5); } });
    this.paths.buildings = new Path2D(); this.paths.grandstands = new Path2D(); this.paths.paddock = new Path2D(); this.paths.tower = new Path2D();
    for (const s of T.structures) {
      const key = { building: "buildings", grandstand: "grandstands", paddock: "paddock", control_tower: "tower" }[s.kind];
      if (!key) continue;
      const p = this.paths[key];
      s.pts.forEach(([x, y], k) => (k ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath();
    }
    // track ribbon = left edge forward + right edge backward
    const track = new Path2D();
    for (let i = 0; i <= this.n; i++) { const [x, y] = this.pt(i % this.n, st.w_left[i % this.n]); i ? track.lineTo(x, y) : track.moveTo(x, y); }
    for (let i = this.n; i >= 0; i--) { const [x, y] = this.pt(i % this.n, -st.w_right[i % this.n]); track.lineTo(x, y); }
    track.closePath(); this.paths.track = track;
    this.paths.edgeL = this.offsetPath(i => st.w_left[i], true); this.paths.edgeR = this.offsetPath(i => -st.w_right[i], true);
    // tyre/tecpro barriers; where the barrier is the pit wall the pit renderer draws it instead
    const nearPit = (x: number, y: number) => T.pit.path.some(q => (q[0] - x) ** 2 + (q[1] - y) ** 2 < (-T.pit.wall_off + 6) ** 2);
    // barriers = boundary rings of the drivable area (same geometry the physics uses)
    const bar = new Path2D();
    for (const ring of R.barriers ?? []) {
      let pen = false;
      for (let k = 0; k < ring.length; k += 2) {
        const x = ring[k], y = ring[k + 1];
        if (nearPit(x, y)) { pen = false; continue; }
        pen ? bar.lineTo(x, y) : bar.moveTo(x, y); pen = true;
      }
    }
    this.paths.barriers = bar;
    // kerbs: 1 m blocks alternating red / white from the track edge outward
    for (let i = 0; i < this.n; i++) {
      const j = (i + 1) % this.n;
      for (const [w, k, sg] of [[st.w_left, st.kerb_left, 1], [st.w_right, st.kerb_right, -1]] as const) {
        const kw = Math.max(k[i], k[j]); if (kw <= 0) continue;
        const p = i % 2 === 0 ? this.kerbRed : this.kerbWhite;
        const a = this.pt(i, sg * w[i]), b = this.pt(j, sg * w[j]), c = this.pt(j, sg * (w[j] + kw)), d = this.pt(i, sg * (w[i] + kw));
        p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.lineTo(c[0], c[1]); p.lineTo(d[0], d[1]); p.closePath();
      }
    }
    // straight-mode zones as a faint band on the track
    const sm = new Path2D();
    for (const z of T.straight_mode) {
      const a = this.idx(z.from), b0 = this.idx(z.to), b = b0 < a ? b0 + this.n : b0;
      for (let i = a; i <= b; i++) { const k = i % this.n, [x, y] = this.pt(k, st.w_left[k] - 0.5); i === a ? sm.moveTo(x, y) : sm.lineTo(x, y); }
      for (let i = b; i >= a; i--) { const k = i % this.n, [x, y] = this.pt(k, -st.w_right[k] + 0.5); sm.lineTo(x, y); }
      sm.closePath();
    }
    this.paths.straightMode = sm;
    // pit lane: fast lane on the track side, working lane on the garage side
    const pitFast = new Path2D(), pitWork = new Path2D(), pitWall = new Path2D();
    const P = T.pit.path;
    let sideSign = 1;
    { const k = Math.round(P.length / 2), a = P[k - 1], b = P[k + 1], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty);
      const g0 = T.pit.boxes[0].garage_xy; sideSign = ((g0[0] - P[k][0]) * (-ty / l) + (g0[1] - P[k][1]) * (tx / l)) > 0 ? 1 : -1; }
    const off = (k: number, d: number): [number, number] => {
      const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
      return [P[k][0] - (ty / l) * d * sideSign, P[k][1] + (tx / l) * d * sideSign];
    };
    const pf = T.pit.fast, pw = T.pit.work;
    ribbon(pitFast, P.length, k => off(k, pf[0]), k => off(k, pf[1]));
    ribbon(pitWork, P.length, k => off(k, pw[0]), k => off(k, pw[1]), k => this.nearGarages(k));
    for (let k = 0; k < P.length; k++) { const [x, y] = off(k, T.pit.wall_off); k ? pitWall.lineTo(x, y) : pitWall.moveTo(x, y); }
    this.paths.pitFast = pitFast; this.paths.pitWork = pitWork; this.paths.pitWall = pitWall;
    this.pitOff = off;
  }
  private pitOff: (k: number, d: number) => [number, number];
  private grassPat: CanvasPattern | null = null; private gravelPat: CanvasPattern | null = null;
  private nearGarages(k: number) {
    const P = this.T.pit.path[k];
    return this.T.pit.boxes.some(b => Math.hypot(b.stop_xy[0] - P[0], b.stop_xy[1] - P[1]) < 40);
  }

  pt(i: number, off: number): [number, number] { const st = this.T.stations; return [st.x[i] + this.nx[i] * off, st.y[i] + this.ny[i] * off]; }
  idx(s: number) { return ((Math.round(s / this.T.stations.ds) % this.n) + this.n) % this.n; }
  heading(i: number) { return Math.atan2(-this.nx[i], this.ny[i]); }   // direction of travel
  private offsetPath(fn: (i: number) => number, close: boolean, skip?: (x: number, y: number) => boolean) {
    const p = new Path2D(); let pen = false, gaps = false;
    for (let i = 0; i <= this.n; i++) {
      const k = i % this.n, [x, y] = this.pt(k, fn(k));
      if (skip && k % 2 === 0 && skip(x, y)) { pen = false; gaps = true; continue; }
      pen ? p.lineTo(x, y) : p.moveTo(x, y); pen = true;
    }
    if (close && !gaps) p.closePath(); return p;
  }

  /** Set the canvas transform for world drawing: x east, y north, `v.z` px per metre. */
  worldTransform(ctx: CanvasRenderingContext2D, v: View) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.setTransform(v.z, 0, 0, -v.z, W / 2 - v.x * v.z, H / 2 + v.y * v.z);
  }
  toScreen(ctx: CanvasRenderingContext2D, v: View, x: number, y: number): [number, number] {
    return [(x - v.x) * v.z + ctx.canvas.width / 2, -(y - v.y) * v.z + ctx.canvas.height / 2];
  }

  private cache: { c: HTMLCanvasElement; z: number; x: number; y: number; key: string } | null = null;
  /** Margin of the cached layer around the viewport (share of its size); larger = fewer rebuilds for a moving camera. */
  cachePad = 0.3;
  /** Static track layer rendered once into an offscreen canvas (viewport + 30 % margin) and blitted each frame.
   *  Rebuilt only when the zoom or the options change or the view pans past the margin. */
  drawCached(ctx: CanvasRenderingContext2D, v: View, opt: { structures?: boolean; straightMode?: boolean; lines?: boolean; grid?: boolean } = {}) {
    const W = ctx.canvas.width, H = ctx.canvas.height, pad = this.cachePad, key = JSON.stringify(opt) + W + "x" + H;
    const c0 = this.cache;
    if (!c0 || c0.z !== v.z || c0.key !== key || Math.abs(v.x - c0.x) * v.z > W * pad || Math.abs(v.y - c0.y) * v.z > H * pad) {
      const c = c0?.c ?? document.createElement("canvas");
      c.width = Math.round(W * (1 + 2 * pad)); c.height = Math.round(H * (1 + 2 * pad));
      this.draw(c.getContext("2d")!, { ...v }, opt);
      this.cache = { c, z: v.z, x: v.x, y: v.y, key };
    }
    const k = this.cache!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(k.c, Math.round(W / 2 + (k.x - v.x) * v.z - k.c.width / 2), Math.round(H / 2 - (k.y - v.y) * v.z - k.c.height / 2));
  }

  private tiles = new Map<string, { c: HTMLCanvasElement; used: number }>(); private tileFrame = 0;
  /** Static track layer as 512 px tiles at the current zoom, for a moving camera: each frame blits the visible tiles
   *  and renders a few new tiles ahead of time, so a follow camera never redraws the whole track at once.
   *  Only missing tiles that are on screen are rendered immediately (start, zoom change). */
  drawTiled(ctx: CanvasRenderingContext2D, v: View, opt: { structures?: boolean; straightMode?: boolean; lines?: boolean; grid?: boolean } = {}, ahead: [number, number] = [0, 0], prefetch = 1) {
    const TS = 512, W = ctx.canvas.width, H = ctx.canvas.height, key0 = JSON.stringify(opt) + "|" + v.z.toFixed(4);
    const ox = Math.round(W / 2 - v.x * v.z), oy = Math.round(H / 2 + v.y * v.z);      // screen pixel of world (0,0)
    const ix0 = Math.floor(-ox / TS), ix1 = Math.floor((W - ox) / TS), iy0 = Math.floor(-oy / TS), iy1 = Math.floor((H - oy) / TS);
    const frame = ++this.tileFrame;
    const get = (ix: number, iy: number) => {
      const k = key0 + "|" + ix + "," + iy; let t = this.tiles.get(k);
      if (!t) {
        const c = document.createElement("canvas"); c.width = TS; c.height = TS;
        this.draw(c.getContext("2d")!, { x: (ix * TS + TS / 2) / v.z, y: -(iy * TS + TS / 2) / v.z, z: v.z }, opt);
        t = { c, used: frame }; this.tiles.set(k, t);
      }
      t.used = frame; return t.c;
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) ctx.drawImage(get(ix, iy), ox + ix * TS, oy + iy * TS);
    // prefetch `prefetch` tiles per frame on the ring just outside the screen, nearest to where the camera is heading
    for (let q = 0; q < prefetch; q++) {
    let best: [number, number] | null = null, bd = Infinity;
    const hx = (ix0 + ix1) / 2 + ahead[0] * (ix1 - ix0 + 2), hy = (iy0 + iy1) / 2 - ahead[1] * (iy1 - iy0 + 2);
    for (let iy = iy0 - 1; iy <= iy1 + 1; iy++) for (let ix = ix0 - 1; ix <= ix1 + 1; ix++) {
      if (ix >= ix0 && ix <= ix1 && iy >= iy0 && iy <= iy1) continue;
      if (this.tiles.has(key0 + "|" + ix + "," + iy)) continue;
      const d = (ix - hx) ** 2 + (iy - hy) ** 2; if (d < bd) { bd = d; best = [ix, iy]; }
    }
    if (best) get(best[0], best[1]); else break;
    }
    if (this.tiles.size > 90) {                                   // drop the least recently used tiles (~1 MB each)
      const old = [...this.tiles.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, this.tiles.size - 70);
      for (const [k] of old) this.tiles.delete(k);
    }
  }

  draw(ctx: CanvasRenderingContext2D, v: View, opt: { structures?: boolean; straightMode?: boolean; lines?: boolean; grid?: boolean } = {}) {
    const p = this.paths, px = 1 / v.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.worldTransform(ctx, v);
    const pat = (pt: CanvasPattern | null, metres: number, fallback: string) => {   // pattern tile = `metres` world metres
      if (!pt) return fallback; pt.setTransform(new DOMMatrix().scale(metres / 32)); return pt;
    };
    // land, trees, buildings
    ctx.fillStyle = COL.ground; ctx.fill(p.infield);
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.save(); ctx.translate(0.8, -0.8); ctx.fill(p.trees, "evenodd"); ctx.restore();
    ctx.fillStyle = COL.tree; ctx.fill(p.trees, "evenodd"); ctx.strokeStyle = COL.treeRim; ctx.lineWidth = Math.max(0.3, px); ctx.stroke(p.trees);
    if (opt.structures !== false) {
      ctx.fillStyle = COL.paddock; ctx.fill(p.paddock);
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.save(); ctx.translate(1.5, -1.5); ctx.fill(p.buildings); ctx.fill(p.grandstands); ctx.restore();
      ctx.fillStyle = COL.building; ctx.fill(p.buildings); ctx.fillStyle = COL.grandstand; ctx.fill(p.grandstands);
      if (v.z > 0.8) this.drawSeatRows(ctx, px);
      ctx.strokeStyle = COL.buildingEdge; ctx.lineWidth = Math.max(0.3, px); ctx.stroke(p.buildings); ctx.stroke(p.grandstands);
      ctx.fillStyle = "#3a4558"; ctx.fill(p.tower); ctx.strokeStyle = "#e5e7eb"; ctx.stroke(p.tower);
    }
    // run-off
    ctx.fillStyle = pat(this.grassPat, 12, COL.grass); ctx.fill(p.domain, "evenodd");
    ctx.fillStyle = COL.asphalt; ctx.fill(p.asphalt, "evenodd");
    ctx.fillStyle = COL.paint; ctx.fill(p.paint, "evenodd");
    ctx.fillStyle = pat(this.gravelPat, 6, COL.gravel); ctx.fill(p.gravel, "evenodd");
    // barriers: tecpro blocks (white with red bands) on a dark base
    const bw = Math.max(0.9, 1.4 * px);
    ctx.lineCap = "butt"; ctx.lineJoin = "round";
    { const b = p.barriers;
      ctx.strokeStyle = COL.barrierEdge; ctx.lineWidth = bw + Math.max(0.3, px); ctx.stroke(b);
      ctx.strokeStyle = COL.tecproW; ctx.lineWidth = bw; ctx.stroke(b);
      if (v.z > 1.2) { ctx.setLineDash([1.0, 1.0]); ctx.strokeStyle = COL.tecproR; ctx.stroke(b); ctx.setLineDash([]); } }
    // pit lane
    ctx.fillStyle = COL.pitWork; ctx.fill(p.pitWork); ctx.fillStyle = COL.pitFast; ctx.fill(p.pitFast);
    ctx.strokeStyle = COL.barrierEdge; ctx.lineWidth = 0.9; ctx.stroke(p.pitWall); ctx.strokeStyle = COL.pitWall; ctx.lineWidth = 0.6; ctx.stroke(p.pitWall);
    this.drawPitDetail(ctx, v);
    // kerbs, asphalt, racing groove, white edge lines
    ctx.fillStyle = COL.kerbR; ctx.fill(this.kerbRed); ctx.fillStyle = COL.kerbW; ctx.fill(this.kerbWhite);
    ctx.fillStyle = COL.track; ctx.fill(p.track, "evenodd");
    if (p.groove) { ctx.strokeStyle = COL.groove; ctx.lineWidth = 2.2; ctx.stroke(p.groove); }
    if (opt.straightMode) { ctx.fillStyle = COL.straightMode; ctx.fill(p.straightMode); }
    ctx.strokeStyle = COL.edge; ctx.lineWidth = Math.max(0.15, 0.9 * px); ctx.stroke(p.edgeL); ctx.stroke(p.edgeR);
    if (opt.grid !== false) this.drawGrid(ctx, v);
    this.drawLines(ctx, v, !!opt.lines);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawCornerBadges(ctx, v);
  }

  /** Seat rows on each grandstand, parallel to its longest side (rows every 0.9 m, as in real stands). */
  private drawSeatRows(ctx: CanvasRenderingContext2D, px: number) {
    for (const s of this.T.structures) {
      if (s.kind !== "grandstand" || s.pts.length < 3) continue;
      let best = 0, ang = 0;
      for (let k = 0; k + 1 < s.pts.length; k++) {
        const dx = s.pts[k + 1][0] - s.pts[k][0], dy = s.pts[k + 1][1] - s.pts[k][1], l = Math.hypot(dx, dy);
        if (l > best) { best = l; ang = Math.atan2(dy, dx); }
      }
      const cx = s.pts.reduce((a, q) => a + q[0], 0) / s.pts.length, cy = s.pts.reduce((a, q) => a + q[1], 0) / s.pts.length;
      const clip = new Path2D(); s.pts.forEach(([x, y], k) => (k ? clip.lineTo(x, y) : clip.moveTo(x, y))); clip.closePath();
      ctx.save(); ctx.clip(clip); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.strokeStyle = COL.seats; ctx.lineWidth = Math.max(0.35, px);
      ctx.beginPath(); for (let y = -60; y <= 60; y += 0.9) { ctx.moveTo(-200, y); ctx.lineTo(200, y); } ctx.stroke();
      ctx.restore();
    }
  }

  private drawPitDetail(ctx: CanvasRenderingContext2D, v: View) {
    const T = this.T, P = T.pit.path;
    // speed-limit lines
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const d of [T.pit.limit_from, T.pit.limit_to]) {
      const k = Math.max(1, Math.min(P.length - 2, Math.round(d)));
      const a = this.pitOff(k, T.pit.fast[0]), b = this.pitOff(k, T.pit.fast[1]);
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // garages and pit boxes, placed on the pit path: box in the working lane, garage behind it
    const pw = T.pit.work, gf = T.pit.garage_front;
    for (const b of T.pit.boxes) {
      const k = Math.max(2, Math.min(P.length - 3, Math.round(b.pit_s))), a = P[k - 2], c = P[k + 2];
      const ang = Math.atan2(c[1] - a[1], c[0] - a[0]);
      const box = this.pitOff(k, (pw[0] + pw[1]) / 2), gar = this.pitOff(k, gf + 3.2);
      ctx.save(); ctx.translate(box[0], box[1]); ctx.rotate(ang);
      ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 0.15; ctx.strokeRect(-3.2, -1.25, 6.4, 2.5); ctx.restore();
      const t = this.teams[b.team];
      ctx.save(); ctx.translate(gar[0], gar[1]); ctx.rotate(ang);
      ctx.fillStyle = COL.garage; ctx.fillRect(-11, -3, 22, 6);
      ctx.strokeStyle = COL.garageEdge; ctx.lineWidth = 0.25; ctx.strokeRect(-11, -3, 22, 6);
      if (t) { ctx.fillStyle = t.body; ctx.fillRect(-10.6, -2.6, 21.2, 1.6); }
      ctx.restore();
      if (t && v.z > 3) {
        const [sx, sy] = this.toScreen(ctx, v, gar[0], gar[1]);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = `bold ${Math.min(14, 1.6 * v.z)}px JetBrains Mono, monospace`;
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t.code3, sx, sy); ctx.restore();
      }
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, v: View) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 0.15;
    for (const g of this.T.grid) {
      const i = this.idx(g.s), h = this.heading(i);
      ctx.save(); ctx.translate(g.xy[0], g.xy[1]); ctx.rotate(h);
      ctx.beginPath(); ctx.moveTo(-1.6, 1.2); ctx.lineTo(3.1, 1.2); ctx.lineTo(3.1, -1.2); ctx.lineTo(-1.6, -1.2); ctx.stroke();   // bracket round the front of the car
      ctx.restore();
    }
    void v;
  }

  private drawLines(ctx: CanvasRenderingContext2D, v: View, data: boolean) {
    const st = this.T.stations;
    const col: Record<string, string> = data
      ? { control: "#ffffff", start: "#ffffff", sector1: "#facc15", sector2: "#facc15", speed_trap: "#a78bfa", overtake_detection: "#22d3ee", overtake_activation: "#22d3ee" }
      : { control: "#ffffff", start: "#ffffff" };   // only the lines painted on the real track
    for (const l of this.T.lines) {
      const c = col[l.id]; if (!c) continue;
      const i = this.idx(l.s), a = this.pt(i, st.w_left[i]), b = this.pt(i, -st.w_right[i]);
      if (l.id === "control") {   // chequered finish line
        const k = 16; for (let q = 0; q < k; q++) for (let r = 0; r < 2; r++) {
          ctx.fillStyle = (q + r) % 2 ? "#0f172a" : "#ffffff";
          const f0 = q / k, f1 = (q + 1) / k, h = this.heading(i), dx = Math.cos(h) * 0.6 * (r - 1), dy = Math.sin(h) * 0.6 * (r - 1);
          ctx.beginPath(); ctx.moveTo(a[0] + (b[0] - a[0]) * f0 + dx, a[1] + (b[1] - a[1]) * f0 + dy); ctx.lineTo(a[0] + (b[0] - a[0]) * f1 + dx, a[1] + (b[1] - a[1]) * f1 + dy);
          ctx.lineTo(a[0] + (b[0] - a[0]) * f1 + dx + Math.cos(h) * 0.6, a[1] + (b[1] - a[1]) * f1 + dy + Math.sin(h) * 0.6);
          ctx.lineTo(a[0] + (b[0] - a[0]) * f0 + dx + Math.cos(h) * 0.6, a[1] + (b[1] - a[1]) * f0 + dy + Math.sin(h) * 0.6); ctx.fill();
        }
      } else { ctx.strokeStyle = c; ctx.lineWidth = Math.max(0.25, 1.5 / v.z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    }
  }

  private drawCornerBadges(ctx: CanvasRenderingContext2D, v: View) {
    const st = this.T.stations, r = Math.max(8, Math.min(14, 1.2 * v.z + 6));
    ctx.font = `bold ${Math.round(r * 0.85)}px JetBrains Mono, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const c of this.T.corners) {
      const i = this.idx(c.apex_s), out = c.dir === "L" ? -1 : 1, w = out > 0 ? st.w_left[i] : st.w_right[i];
      const [x, y] = this.pt(i, out * (w + 6 + 18 / v.z)), [sx, sy] = this.toScreen(ctx, v, x, y);
      ctx.fillStyle = "#0f172a"; ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f8fafc"; ctx.fillText(String(c.n).padStart(2, "0"), sx, sy + 0.5);
    }
  }
}

function makePattern(size: number, paint: (g: CanvasRenderingContext2D, s: number) => void): CanvasPattern | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d")!; paint(g, size);
  return g.createPattern(c, "repeat");
}
function ringTo(p: Path2D, ring: number[]) { for (let k = 0; k < ring.length; k += 2) (k ? p.lineTo(ring[k], ring[k + 1]) : p.moveTo(ring[k], ring[k + 1])); p.closePath(); }
function ribbon(p: Path2D, n: number, a: (k: number) => [number, number], b: (k: number) => [number, number], keep: (k: number) => boolean = () => true) {
  let open = false, start = 0;
  const flush = (end: number) => {
    if (end - start < 2) return;
    for (let k = start; k < end; k++) { const q = a(k); k === start ? p.moveTo(q[0], q[1]) : p.lineTo(q[0], q[1]); }
    for (let k = end - 1; k >= start; k--) { const q = b(k); p.lineTo(q[0], q[1]); }
    p.closePath();
  };
  for (let k = 0; k < n; k++) { const on = keep(k); if (on && !open) { open = true; start = k; } if (!on && open) { open = false; flush(k); } }
  if (open) flush(n);
}
function nearestIdx(P: [number, number][], q: [number, number]) { let b = 0, d = 1e18; P.forEach((p, k) => { const e = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (e < d) { d = e; b = k; } }); return b; }
