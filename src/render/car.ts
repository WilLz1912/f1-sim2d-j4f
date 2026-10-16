// F1 2026 car, top view, in metres at real proportions (length, wheelbase, track, tyre sizes from
// data/cars/cars_2026.json). Liveries are painted per team inside a clip of the bodywork, designed from 2026 race
// photos (Wikimedia Commons, FIA F1 Austria 2026). Origin = car centre, +x forward, +y = right side of the car
// (canvas y-down art frame). Drawn small in the game, so forms are smooth, outlines crisp and colour zones large.

export interface Livery { primary: string; secondary: string; tertiary?: string; wing?: string; accent?: string; desc?: string }
export interface Helmet { base: string; second: string; accent: string }
export interface CarShape {
  length: number; width: number; wheelbase: number;
  tyreF: { w: number; d: number }; tyreR: { w: number; d: number };
  trackF: number; trackR: number;
}
export interface CarLook {
  team: string; livery: Livery; helmet: Helmet; tyreColor: string; tcam?: "black" | "yellow"; number?: number;
  aeroMode?: "Z" | "X" | "MOM" | "CLIP" | "S-CLIP"; selected?: boolean;
  floorDamage?: number; wingDamage?: number; treadContam?: number;
}

type Ctx = CanvasRenderingContext2D;
const CARBON = "#15171b", EDGE = "rgba(0,0,0,0.6)", TCAM = { black: "#050506", yellow: "#E6FF00" };

/** Smooth closed outline through half-profile points (x, y>=0), mirrored to -y. */
function outline(half: [number, number][]): Path2D {
  const pts: [number, number][] = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [x, -y] as [number, number])];
  const p = new Path2D(), n = pts.length, mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]); p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const a = pts[i], m = mid(a, pts[(i + 1) % n]); p.quadraticCurveTo(a[0], a[1], m[0], m[1]); }
  p.closePath(); return p;
}

interface Geo { h: number; xF: number; xR: number; body: Path2D; floor: Path2D; pods: Path2D; cover: Path2D; nose: Path2D }
const cache = new Map<string, Geo>();
function geo(s: CarShape): Geo {
  const key = `${s.length}|${s.wheelbase}`; const c = cache.get(key); if (c) return c;
  const h = s.length / 2, xF = h * 0.60, xR = xF - s.wheelbase;
  const nose = outline([[h - 0.22, 0], [h - 0.26, 0.06], [xF + 0.4, 0.12], [xF - 0.2, 0.2], [0.75, 0.30], [0.2, 0.34], [0.2, 0]]);
  const pods = outline([[0.80, 0], [0.80, 0.55], [0.62, 0.80], [0.10, 0.82], [-0.55, 0.70], [-1.10, 0.44], [-1.50, 0.26], [-1.62, 0]]);
  const cover = outline([[0.10, 0], [0.10, 0.30], [-0.80, 0.30], [-1.60, 0.20], [xR - 0.30, 0.14], [xR - 0.62, 0.10], [xR - 0.62, 0]]);
  const floor = outline([[1.05, 0], [1.05, 0.40], [0.75, 0.88], [-1.25, 0.90], [-1.62, 0.78], [xR + 0.40, 0.56], [xR - 0.1, 0.40], [xR - 0.1, 0]]);
  const body = new Path2D(); body.addPath(nose); body.addPath(pods); body.addPath(cover);
  const g = { h, xF, xR, body, floor, pods, cover, nose }; cache.set(key, g); return g;
}

// Team painters run inside a clip of the bodywork (nose + sidepods + engine cover), over the primary colour.
type Painter = (ctx: Ctx, g: Geo, c: Livery) => void;
const rect = (ctx: Ctx, x0: number, x1: number, y0: number, y1: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0); };
const poly = (ctx: Ctx, pts: [number, number][], col: string) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
const both = (f: (sg: number) => void) => { f(1); f(-1); };
const bullLogo = (ctx: Ctx, x: number, r: number, sun: string, bull: string) => {
  ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(x, 0, r, 0, Math.PI * 2); ctx.fill();
  both(sg => poly(ctx, [[x + r * 0.2, sg * r * 0.15], [x - r * 1.9, sg * r * 1.25], [x - r * 2.4, sg * r * 0.9], [x - r * 0.5, sg * r * 0.1]], bull));
};
const PAINT: Record<string, Painter> = {
  mclaren: (ctx, g, c) => {   // papaya; anthracite engine cover and sidepod tails
    poly(ctx, [[-0.15, -0.34], [-0.15, 0.34], [-0.9, 0.5], [-3, 0.5], [-3, -0.5], [-0.9, -0.5]], c.secondary);
    both(sg => poly(ctx, [[-0.35, sg * 0.9], [-1.0, sg * 0.9], [-1.0, sg * 0.25], [-0.6, sg * 0.4]], c.secondary));
  },
  mercedes: (ctx, g, c) => {  // black; silver star-field fading back along the sidepods; teal pinstripe
    both(sg => { for (let k = 0; k < 6; k++) { const x = 0.35 - k * 0.24; poly(ctx, [[x, sg * 0.42], [x - 0.08, sg * 0.42], [x - 0.34, sg * 0.82], [x - 0.26, sg * 0.82]], c.secondary); } });
    both(sg => rect(ctx, g.h, -2.4, sg > 0 ? 0.30 : -0.33, sg > 0 ? 0.33 : -0.30, c.accent ?? "#00D7B6"));
    rect(ctx, g.h, g.xF - 0.1, -0.025, 0.025, c.accent ?? "#00D7B6");
  },
  redbull: (ctx, g, c) => {   // matte navy; bull logo on the engine cover; red/yellow nose; white Oracle bars
    bullLogo(ctx, -0.85, 0.16, c.tertiary ?? "#FFC906", c.secondary);
    rect(ctx, g.h, g.xF + 0.25, -0.2, 0.2, c.secondary); rect(ctx, g.xF + 0.25, g.xF + 0.05, -0.2, 0.2, c.tertiary ?? "#FFC906");
    both(sg => rect(ctx, 0.25, -0.45, sg > 0 ? 0.58 : -0.66, sg > 0 ? 0.66 : -0.58, "#ffffff"));
  },
  ferrari: (ctx, g, c) => {   // red; white around cockpit and airbox; black gearbox cover
    poly(ctx, [[0.62, 0], [0.55, 0.34], [-0.15, 0.40], [-0.95, 0.33], [-0.95, -0.33], [-0.15, -0.40], [0.55, -0.34]], c.secondary);
    rect(ctx, g.xR + 0.1, -3, -0.5, 0.5, c.tertiary ?? CARBON);
  },
  williams: (ctx, g, c) => {  // mid blue; navy rear and engine cover; white Atlassian marks
    rect(ctx, -0.55, -3, -1, 1, c.secondary);
    both(sg => poly(ctx, [[0.3, sg * 0.5], [0.0, sg * 0.74], [-0.18, sg * 0.74], [0.12, sg * 0.5]], c.accent ?? "#fff"));
  },
  vcarb: (ctx, g, c) => {     // white; navy sidepod tails and engine cover; Red Bull logo; Visa blue
    rect(ctx, -0.6, -3, -1, 1, c.secondary);
    bullLogo(ctx, -0.95, 0.14, c.accent ?? "#FFC906", c.tertiary ?? "#D8102C");
    both(sg => rect(ctx, 0.35, -0.35, sg > 0 ? 0.6 : -0.7, sg > 0 ? 0.7 : -0.6, "#1A4BD6"));
  },
  aston: (ctx, g, c) => {     // racing green; lime pinstripes along the sidepods
    both(sg => { ctx.strokeStyle = c.secondary; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(0.6, sg * 0.74); ctx.quadraticCurveTo(-0.3, sg * 0.86, -1.1, sg * 0.42); ctx.stroke(); });
    rect(ctx, 0.35, 0.2, -0.36, 0.36, c.secondary);
  },
  haas: (ctx, g, c) => {      // white; black tails; big red GR on the engine cover; red nose
    rect(ctx, -1.1, -3, -1, 1, c.tertiary ?? CARBON);
    rect(ctx, -0.35, -0.55, -0.26, 0.26, c.secondary); rect(ctx, -0.65, -0.85, -0.26, 0.26, c.secondary);
    rect(ctx, g.h, g.xF + 0.35, -0.2, 0.2, c.secondary);
  },
  audi: (ctx, g, c) => {      // titanium; lava-red sidepod tails; black engine cover
    both(sg => poly(ctx, [[-0.35, sg * 0.9], [-1.7, sg * 0.9], [-1.7, sg * 0.2], [-0.6, sg * 0.32]], c.secondary));
    rect(ctx, -0.1, -3, -0.28, 0.28, c.tertiary ?? CARBON);
  },
  alpine: (ctx, g, c) => {    // pink front and sidepods; blue engine cover and tail; white BWT
    rect(ctx, -0.05, -3, -0.31, 0.31, c.secondary); rect(ctx, -1.05, -3, -1, 1, c.secondary);
    both(sg => rect(ctx, 0.2, -0.45, sg > 0 ? 0.5 : -0.62, sg > 0 ? 0.62 : -0.5, c.accent ?? "#fff"));
  },
  cadillac: (ctx, g, c) => {  // two-sided: grayish-white left flank, black right flank, chrome spine
    rect(ctx, 3, -3, 0.0, 1, c.secondary);
    rect(ctx, 3, -3, -0.02, 0.02, c.accent ?? "#C9CCD1");
  },
};

export function drawCar(ctx: Ctx, s: CarShape, look: CarLook) {
  const g = geo(s), c = look.livery;
  if (look.selected) { ctx.strokeStyle = "#00f0ff"; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.ellipse(0, 0, g.h * 1.3, 1.25, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (look.aeroMode === "MOM") {
    const gr = ctx.createRadialGradient(g.xR - 0.6, 0, 0.2, g.xR - 0.8, 0, 2.6);
    gr.addColorStop(0, "rgba(168, 85, 247, 0.85)"); gr.addColorStop(1, "rgba(168, 85, 247, 0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.xR - 0.6, 0, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  // shadow, floor
  ctx.save(); ctx.translate(-0.10, 0.12); ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fill(g.floor); ctx.restore();
  ctx.fillStyle = (look.floorDamage ?? 0) > 0.15 ? "#7c2d12" : CARBON; ctx.fill(g.floor);
  // suspension arms
  const yF = s.trackF / 2, yR = s.trackR / 2;
  ctx.strokeStyle = "#2e333c"; ctx.lineWidth = 0.045; ctx.beginPath();
  both(sg => {
    ctx.moveTo(g.xF + 0.20, sg * 0.14); ctx.lineTo(g.xF, sg * yF); ctx.moveTo(g.xF - 0.40, sg * 0.20); ctx.lineTo(g.xF, sg * yF);
    ctx.moveTo(g.xR + 0.40, sg * 0.24); ctx.lineTo(g.xR, sg * yR); ctx.moveTo(g.xR - 0.25, sg * 0.14); ctx.lineTo(g.xR, sg * yR);
  });
  ctx.stroke();
  // tyres: real size, slick tread + compound-coloured sidewall stripe
  const tyre = (x: number, y: number, d: number, w: number) => {
    ctx.fillStyle = (look.treadContam ?? 0) > 0.25 ? "#4a3519" : "#0c0d10";
    ctx.beginPath(); ctx.roundRect(x - d / 2, y - w / 2, d, w, 0.09); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(x - d * 0.35, y - w * 0.32, d * 0.7, w * 0.18);
    ctx.fillStyle = look.tyreColor; ctx.fillRect(x - d * 0.40, y + Math.sign(y) * (w / 2 - 0.045) - 0.022, d * 0.80, 0.045);
  };
  both(sg => { tyre(g.xF, sg * yF, s.tyreF.d, s.tyreF.w); tyre(g.xR, sg * yR, s.tyreR.d, s.tyreR.w); });
  // bodywork in the primary colour, team livery clipped to it, then outline
  ctx.fillStyle = c.primary; ctx.fill(g.pods); ctx.fill(g.cover); ctx.fill(g.nose);
  ctx.save(); ctx.clip(g.body); (PAINT[look.team] ?? (() => {}))(ctx, g, c);
  // soft top-light: brighter spine, darker flanks
  const sh = ctx.createLinearGradient(0, -0.9, 0, 0.9); sh.addColorStop(0, "rgba(0,0,0,0.22)"); sh.addColorStop(0.5, "rgba(255,255,255,0.08)"); sh.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = sh; ctx.fillRect(-3, -1, 6, 2); ctx.restore();
  ctx.strokeStyle = EDGE; ctx.lineWidth = 0.03; ctx.stroke(g.pods); ctx.stroke(g.cover); ctx.stroke(g.nose);
  // number on the nose
  if (look.number !== undefined) {
    ctx.save(); ctx.translate(g.xF + 0.45, 0); ctx.rotate(Math.PI / 2);
    ctx.font = "bold 0.22px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 0.04; ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.strokeText(String(look.number), 0, 0); ctx.fillStyle = "#fff"; ctx.fillText(String(look.number), 0, 0); ctx.restore();
  }
  // mirrors
  both(sg => { ctx.fillStyle = CARBON; ctx.fillRect(0.38, sg > 0 ? 0.30 : -0.46, 0.03, 0.16); ctx.fillStyle = c.primary; ctx.fillRect(0.33, sg > 0 ? 0.44 : -0.54, 0.13, 0.10); });
  // cockpit, helmet, halo, T-cam
  ctx.fillStyle = "#07090d"; ctx.beginPath(); ctx.ellipse(0.0, 0, 0.40, 0.22, 0, 0, Math.PI * 2); ctx.fill();
  const hm = look.helmet, hr = 0.13, hx = -0.08;
  ctx.fillStyle = hm.base; ctx.beginPath(); ctx.arc(hx, 0, hr, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(hx, 0, hr, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = hm.second; ctx.fillRect(hx - hr, -hr * 0.3, hr * 2, hr * 0.6); ctx.fillStyle = hm.accent; ctx.fillRect(hx + hr * 0.5, -hr, hr * 0.5, hr * 2); ctx.restore();
  ctx.strokeStyle = "#1d2128"; ctx.lineWidth = 0.055; ctx.beginPath();
  ctx.moveTo(0.40, 0); ctx.quadraticCurveTo(0.28, 0.24, -0.28, 0.23); ctx.moveTo(0.40, 0); ctx.quadraticCurveTo(0.28, -0.24, -0.28, -0.23); ctx.stroke();
  ctx.fillStyle = TCAM[look.tcam ?? "black"]; ctx.beginPath(); ctx.roundRect(-0.46, -0.07, 0.15, 0.14, 0.03); ctx.fill();
  // front wing: swept main plane + flaps, endplates in the accent colour
  const fx = g.h - 0.30, fw = Math.min(0.92, s.width / 2 - 0.03), wc = (look.wingDamage ?? 0) > 0.18 ? "#ff1801" : (c.wing ?? CARBON);
  const fwPath = new Path2D(); fwPath.moveTo(fx + 0.10, 0); fwPath.quadraticCurveTo(fx + 0.06, fw * 0.6, fx - 0.10, fw); fwPath.lineTo(fx - 0.30, fw);
  fwPath.quadraticCurveTo(fx - 0.12, fw * 0.5, fx - 0.10, 0); fwPath.quadraticCurveTo(fx - 0.12, -fw * 0.5, fx - 0.30, -fw); fwPath.lineTo(fx - 0.10, -fw);
  fwPath.quadraticCurveTo(fx + 0.06, -fw * 0.6, fx + 0.10, 0); fwPath.closePath();
  ctx.fillStyle = wc; ctx.fill(fwPath); ctx.strokeStyle = EDGE; ctx.lineWidth = 0.025; ctx.stroke(fwPath);
  both(sg => { ctx.fillStyle = c.accent ?? c.primary; ctx.fillRect(fx - 0.34, sg > 0 ? fw - 0.05 : -fw, 0.30, 0.05); });
  // rear wing (narrower than the rear track), endplates; colour shows the aero mode
  const isX = look.aeroMode === "X" || look.aeroMode === "MOM";
  const rwc = look.aeroMode === "S-CLIP" ? "#ef4444" : look.aeroMode === "CLIP" ? "#f59e0b" : isX ? "#00f0ff" : (c.wing ?? CARBON);
  const rx = g.xR - 0.60, rw = 0.50;
  ctx.fillStyle = rwc; ctx.beginPath(); ctx.roundRect(rx - 0.32, -rw, 0.32, rw * 2, 0.05); ctx.fill(); ctx.strokeStyle = EDGE; ctx.stroke();
  both(sg => { ctx.fillStyle = c.primary; ctx.fillRect(rx - 0.38, sg > 0 ? rw - 0.04 : -rw - 0.0, 0.44, 0.05); });
}
