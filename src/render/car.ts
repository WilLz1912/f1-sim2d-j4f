// F1 2026 car, top view, drawn in metres at real proportions (length, wheelbase, track, tyre sizes from
// data/cars/cars_2026.json). Each team has its own livery painter, designed from 2026 race photos
// (Wikimedia Commons, Austrian GP 2026). Origin = car centre, +x forward, +y = right side (canvas y-down art frame).
// Small on screen by design: shapes are simple, outlines crisp, liveries readable at 15-40 px per car.

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

const CARBON = "#14161a", OUTLINE = "rgba(0,0,0,0.55)", TCAM = { black: "#050506", yellow: "#E6FF00" };
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

function path(ctx: Ctx, pts: Pt[], close = true) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); if (close) ctx.closePath(); }
function fill(ctx: Ctx, pts: Pt[], color: string, outline = false) { path(ctx, pts); ctx.fillStyle = color; ctx.fill(); if (outline) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.025; ctx.stroke(); } }
const mirror = (pts: Pt[]): Pt[] => [...pts, ...pts.slice().reverse().map(([x, y]) => [x, -y] as Pt)];

/** Body geometry in metres for a car of length L (shapes scale with L; axles from the real wheelbase). */
function geom(s: CarShape) {
  const L = s.length, h = L / 2, xF = h * 0.60, xR = xF - s.wheelbase;
  return {
    L, h, xF, xR,
    // half outlines (y >= 0), mirrored for the full shape
    nose: [[h - 0.05, 0], [h - 0.12, 0.07], [xF + 0.25, 0.15], [xF - 0.35, 0.24]] as Pt[],
    tub: [[xF - 0.35, 0.24], [0.55, 0.36], [-0.05, 0.40], [-0.75, 0.34]] as Pt[],
    pod: [[0.70, 0], [0.70, 0.30], [0.45, 0.80], [-0.30, 0.82], [-1.10, 0.62], [-1.55, 0.36], [-1.70, 0]] as Pt[],
    floor: [[1.00, 0], [1.00, 0.55], [0.55, 0.90], [-1.45, 0.90], [xR + 0.45, 0.70], [xR + 0.20, 0.45], [xR - 0.10, 0.45], [xR - 0.10, 0]] as Pt[],
    cover: [[-0.30, 0.30], [-1.20, 0.26], [xR + 0.10, 0.17], [xR - 0.55, 0.12]] as Pt[],
  };
}

// Livery painters: draw over the base body. p = primary, s = secondary, t = tertiary, a = accent.
type Painter = (ctx: Ctx, g: ReturnType<typeof geom>, c: Livery) => void;
const band = (ctx: Ctx, x0: number, x1: number, w0: number, w1: number, color: string) => fill(ctx, [[x0, -w0], [x0, w0], [x1, w1], [x1, -w1]], color);
const PAINT: Record<string, Painter> = {
  mclaren: (ctx, g, c) => {     // papaya front and sidepod tops, black rear body and engine cover
    fill(ctx, mirror([[-0.55, 0.0], [-0.55, 0.62], [-1.10, 0.62], [-1.55, 0.36], [-1.70, 0]]), c.secondary);
    fill(ctx, mirror(g.cover), c.secondary);
    band(ctx, -0.35, -0.70, 0.36, 0.30, c.primary);
  },
  mercedes: (ctx, g, c) => {    // black, silver star-stripe pattern on the sidepods, teal pinstripes
    for (const sg of [1, -1]) for (let k = 0; k < 5; k++) {
      const x0 = 0.25 - k * 0.28; fill(ctx, [[x0, sg * 0.45], [x0 - 0.12, sg * 0.45], [x0 - 0.40, sg * 0.76], [x0 - 0.28, sg * 0.76]], c.secondary);
    }
    ctx.strokeStyle = c.accent ?? "#00D7B6"; ctx.lineWidth = 0.05;
    for (const sg of [1, -1]) { path(ctx, [[g.h - 0.2, sg * 0.05], [0.6, sg * 0.30], [-1.6, sg * 0.30]], false); ctx.stroke(); }
  },
  redbull: (ctx, g, c) => {     // matte navy, red bulls + yellow sun on the engine cover, red/yellow nose
    ctx.fillStyle = c.tertiary ?? "#FFC906"; ctx.beginPath(); ctx.arc(-1.05, 0, 0.17, 0, Math.PI * 2); ctx.fill();
    for (const sg of [1, -1]) fill(ctx, [[-0.70, sg * 0.05], [-1.25, sg * 0.28], [-1.55, sg * 0.20], [-1.0, sg * 0.03]], c.secondary);
    fill(ctx, mirror([[g.h - 0.05, 0], [g.h - 0.12, 0.07], [g.h - 0.55, 0.11], [g.h - 0.55, 0]]), c.secondary);
    band(ctx, g.h - 0.55, g.h - 0.70, 0.11, 0.12, c.tertiary ?? "#FFC906");
    for (const sg of [1, -1]) fill(ctx, [[0.30, sg * 0.50], [-0.40, sg * 0.66], [-0.55, sg * 0.58], [0.20, sg * 0.44]], c.secondary);
  },
  ferrari: (ctx, g, c) => {     // red, white around the cockpit and airbox, black rear
    fill(ctx, mirror([[0.55, 0.0], [0.55, 0.30], [0.10, 0.42], [-0.90, 0.30], [-1.05, 0]]), c.secondary);
    fill(ctx, mirror([[g.xR + 0.10, 0.17], [g.xR - 0.55, 0.12], [g.xR - 0.55, 0]]), c.tertiary ?? CARBON);
  },
  williams: (ctx, g, c) => {    // mid blue top, navy lower/rear, white Atlassian chevron
    fill(ctx, mirror([[-0.9, 0.0], [-0.9, 0.55], [-1.10, 0.62], [-1.55, 0.36], [-1.70, 0]]), c.secondary);
    fill(ctx, mirror(g.cover.slice(1)), c.secondary);
    for (const sg of [1, -1]) fill(ctx, [[0.25, sg * 0.50], [-0.10, sg * 0.70], [-0.30, sg * 0.70], [0.05, sg * 0.50]], c.accent ?? "#ffffff");
  },
  vcarb: (ctx, g, c) => {       // white, navy lower sidepods and rear, Red Bull logo, Visa blue
    for (const sg of [1, -1]) fill(ctx, [[0.45, sg * 0.66], [-0.30, sg * 0.82], [-1.10, sg * 0.62], [-1.55, sg * 0.36], [-0.60, sg * 0.52]], c.secondary);
    fill(ctx, mirror([[g.xR + 0.10, 0.17], [g.xR - 0.55, 0.12], [g.xR - 0.55, 0]]), c.secondary);
    ctx.fillStyle = c.accent ?? "#FFC906"; ctx.beginPath(); ctx.arc(-1.00, 0, 0.14, 0, Math.PI * 2); ctx.fill();
    for (const sg of [1, -1]) fill(ctx, [[-0.75, sg * 0.04], [-1.20, sg * 0.24], [-1.45, sg * 0.17], [-1.0, sg * 0.03]], c.tertiary ?? "#D8102C");
  },
  aston: (ctx, g, c) => {       // racing green, lime pinstripes and lime front-wing tips
    ctx.strokeStyle = c.secondary; ctx.lineWidth = 0.06;
    for (const sg of [1, -1]) { path(ctx, [[0.55, sg * 0.70], [-0.30, sg * 0.79], [-1.10, sg * 0.60]], false); ctx.stroke(); }
    band(ctx, -0.20, -0.35, 0.33, 0.33, c.secondary);
  },
  haas: (ctx, g, c) => {        // white, big red GR on the engine cover, black lower edges, red nose
    fill(ctx, mirror([[-0.45, 0.0], [-0.45, 0.26], [-1.35, 0.24], [-1.35, 0]]), c.secondary);
    band(ctx, -0.80, -0.92, 0.26, 0.25, c.primary);
    for (const sg of [1, -1]) fill(ctx, [[0.40, sg * 0.78], [-0.30, sg * 0.82], [-1.10, sg * 0.62], [-1.20, sg * 0.56], [-0.30, sg * 0.74]], c.tertiary ?? CARBON);
    fill(ctx, mirror([[g.h - 0.05, 0], [g.h - 0.12, 0.07], [g.h - 0.70, 0.12], [g.h - 0.70, 0]]), c.secondary);
  },
  audi: (ctx, g, c) => {        // titanium silver, lava-red rear sidepods and engine cover panel, black rear
    for (const sg of [1, -1]) fill(ctx, [[-0.35, sg * 0.82], [-1.10, sg * 0.62], [-1.55, sg * 0.36], [-0.70, sg * 0.40], [-0.35, sg * 0.55]], c.secondary);
    fill(ctx, mirror([[-1.20, 0.26], [g.xR + 0.10, 0.17], [g.xR - 0.55, 0.12], [g.xR - 0.55, 0]]), c.tertiary ?? CARBON);
  },
  alpine: (ctx, g, c) => {      // pink front and sidepods, blue engine cover and rear
    fill(ctx, mirror(g.cover), c.secondary);
    fill(ctx, mirror([[-1.10, 0.62], [-1.55, 0.36], [-1.70, 0], [-1.10, 0]]), c.secondary);
    band(ctx, 0.20, -0.30, 0.37, 0.40, c.accent ?? "#ffffff");
  },
  cadillac: (ctx, g, c) => {    // two-sided: grayish-white left flank (primary), black right flank (+y)
    ctx.save(); ctx.beginPath(); ctx.rect(-4, 0.02, 8, 2); ctx.clip();
    fill(ctx, mirror(g.pod), c.secondary); fill(ctx, mirror([...g.nose, ...g.tub.slice(1)]), c.secondary); fill(ctx, mirror(g.cover), c.secondary);
    ctx.restore();
  },
};

export function drawCar(ctx: Ctx, s: CarShape, look: CarLook) {
  const g = geom(s), c = look.livery, W = s.width;
  if (look.selected) { ctx.strokeStyle = "#00f0ff"; ctx.lineWidth = 0.08; ctx.beginPath(); ctx.ellipse(0, 0, g.h * 1.35, W * 0.9, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (look.aeroMode === "MOM") {
    const gr = ctx.createRadialGradient(g.xR - 0.6, 0, 0.2, g.xR - 0.8, 0, 2.6);
    gr.addColorStop(0, "rgba(168, 85, 247, 0.85)"); gr.addColorStop(1, "rgba(168, 85, 247, 0)");
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.xR - 0.6, 0, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)"; path(ctx, mirror(g.floor).map(([x, y]) => [x - 0.08, y + 0.08] as Pt)); ctx.fill();
  // floor (carbon) and suspension
  fill(ctx, mirror(g.floor), (look.floorDamage ?? 0) > 0.15 ? "#7c2d12" : CARBON);
  const yF = s.trackF / 2, yR = s.trackR / 2;
  ctx.strokeStyle = "#2a2f38"; ctx.lineWidth = 0.05; ctx.beginPath();
  for (const sg of [1, -1]) {
    ctx.moveTo(g.xF + 0.18, sg * 0.18); ctx.lineTo(g.xF, sg * yF); ctx.moveTo(g.xF - 0.35, sg * 0.22); ctx.lineTo(g.xF, sg * yF);
    ctx.moveTo(g.xR + 0.40, sg * 0.30); ctx.lineTo(g.xR, sg * yR); ctx.moveTo(g.xR - 0.15, sg * 0.20); ctx.lineTo(g.xR, sg * yR);
  }
  ctx.stroke();
  // tyres at real size, compound band on the sidewall (seen from above as the outer edge)
  const tyre = (x: number, y: number, d: number, w: number) => {
    ctx.fillStyle = (look.treadContam ?? 0) > 0.25 ? "#4a3519" : "#0b0c0f";
    ctx.beginPath(); ctx.roundRect(x - d / 2, y - w / 2, d, w, 0.07); ctx.fill();
    ctx.fillStyle = look.tyreColor; const ey = y + Math.sign(y) * (w / 2 - 0.035);
    ctx.fillRect(x - d * 0.42, ey - 0.025, d * 0.84, 0.05);
  };
  for (const sg of [1, -1]) { tyre(g.xF, sg * yF, s.tyreF.d, s.tyreF.w); tyre(g.xR, sg * yR, s.tyreR.d, s.tyreR.w); }
  // body: sidepods, tub, nose, engine cover in the primary colour, then the team painter
  fill(ctx, mirror(g.pod), c.primary, true);
  fill(ctx, mirror([...g.nose, ...g.tub.slice(1)]), c.primary, true);
  fill(ctx, mirror(g.cover), c.primary);
  (PAINT[look.team] ?? (() => {}))(ctx, g, c);
  // engine-cover spine (shark fin) seen from above
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 0.03; path(ctx, [[-0.45, 0], [g.xR - 0.5, 0]], false); ctx.stroke();
  // race number on the nose
  if (look.number !== undefined) {
    ctx.save(); ctx.translate(g.xF + 0.55, 0); ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 0.24px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 0.03; ctx.strokeText(String(look.number), 0, 0); ctx.fillText(String(look.number), 0, 0); ctx.restore();
  }
  // mirrors
  for (const sg of [1, -1]) { ctx.fillStyle = c.primary; ctx.fillRect(0.30, sg * 0.50 - 0.05, 0.14, 0.10); ctx.fillStyle = CARBON; ctx.fillRect(0.36, sg * 0.36 - 0.07, 0.02, sg * 0.14); }
  // cockpit, helmet, halo, T-cam
  ctx.fillStyle = "#06080c"; ctx.beginPath(); ctx.ellipse(0.02, 0, 0.42, 0.24, 0, 0, Math.PI * 2); ctx.fill();
  const hm = look.helmet, hr = 0.14, hx = -0.08;
  ctx.fillStyle = hm.base; ctx.beginPath(); ctx.arc(hx, 0, hr, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(hx, 0, hr, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = hm.second; ctx.fillRect(hx - hr, -hr * 0.30, hr * 2, hr * 0.60);
  ctx.fillStyle = hm.accent; ctx.fillRect(hx + hr * 0.50, -hr, hr * 0.5, hr * 2);
  ctx.restore();
  ctx.strokeStyle = "#20242b"; ctx.lineWidth = 0.06; ctx.beginPath();
  ctx.moveTo(0.42, 0); ctx.lineTo(0.30, 0.22); ctx.lineTo(-0.25, 0.24); ctx.moveTo(0.30, -0.22); ctx.lineTo(0.42, 0); ctx.moveTo(0.30, -0.22); ctx.lineTo(-0.25, -0.24); ctx.stroke();
  ctx.fillStyle = TCAM[look.tcam ?? "black"]; ctx.fillRect(-0.42, -0.07, 0.16, 0.14);
  // front wing (2026, slightly narrower) and endplates
  const fwx = g.h - 0.30, fwW = Math.min(0.90, W / 2 - 0.05);
  fill(ctx, [[fwx + 0.18, -fwW], [fwx + 0.18, fwW], [fwx - 0.16, fwW], [fwx - 0.02, 0.15], [fwx - 0.02, -0.15], [fwx - 0.16, -fwW]],
    (look.wingDamage ?? 0) > 0.18 ? "#ff1801" : (c.wing ?? CARBON), true);
  for (const sg of [1, -1]) { ctx.fillStyle = c.accent ?? c.primary; ctx.fillRect(fwx - 0.16, sg * fwW - (sg > 0 ? 0.06 : 0), 0.34, 0.06); }
  // rear wing, coloured by aero mode
  const isX = look.aeroMode === "X" || look.aeroMode === "MOM";
  const rw = look.aeroMode === "S-CLIP" ? "#ef4444" : look.aeroMode === "CLIP" ? "#f59e0b" : isX ? "#00f0ff" : (c.wing ?? CARBON);
  const rx = g.xR - 0.62, rwW = 0.52;
  fill(ctx, [[rx, -rwW], [rx, rwW], [rx - 0.30, rwW], [rx - 0.30, -rwW]], rw, true);
  for (const sg of [1, -1]) { ctx.fillStyle = c.primary; ctx.fillRect(rx - 0.34, sg * rwW - (sg > 0 ? 0.05 : 0), 0.40, 0.05); }
}
