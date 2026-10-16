// F1 2026 car, top view. Shapes are Argon's V11 drawF1Car2026; V12 places the axles and tyres at the real
// dimensions of each car (data/cars/cars_2026.json) and adds the 2026 livery zones, the driver's helmet colours,
// the T-camera colour (black = first car, fluorescent yellow = second car) and the race number.
// Units: metres, origin at the car's centre, +x forward, +y = right side of the car (canvas y-down art frame).

export interface Livery {
  body: string; sidepod: string; wing: string; halo: string;
  sidepodL?: string; sidepodR?: string; engineCover?: string; cockpit?: string; rearWing?: string; accent?: string; noseTip?: string;
}
export interface Helmet { base: string; second: string; accent: string }
export interface CarShape {
  length: number; width: number; wheelbase: number;
  tyreF: { w: number; d: number }; tyreR: { w: number; d: number };
  trackF: number; trackR: number;
}
export interface CarLook {
  livery: Livery; helmet: Helmet | string; tyreColor: string; tcam?: "black" | "yellow"; number?: number;
  aeroMode?: "Z" | "X" | "MOM" | "CLIP" | "S-CLIP"; selected?: boolean;
  floorDamage?: number; wingDamage?: number; treadContam?: number;
}
const TCAM = { black: "#050506", yellow: "#E6FF00" };

export function drawCar(ctx: CanvasRenderingContext2D, s: CarShape, look: CarLook) {
  const L = s.length, W = s.width, t = look.livery;
  const xF = L * 0.30, xR = xF - s.wheelbase;            // axle positions (V11 had the front axle at 0.30 L)
  const poly = (pts: number[][]) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };

  if (look.selected) {
    ctx.strokeStyle = "#00f0ff"; ctx.lineWidth = 0.08;
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.74, W * 0.95, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (look.aeroMode === "MOM") {
    const g = ctx.createRadialGradient(-L * 0.45, 0, 0.2, -L * 0.55, 0, L * 0.48);
    g.addColorStop(0, "rgba(168, 85, 247, 0.85)"); g.addColorStop(1, "rgba(168, 85, 247, 0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-L * 0.45, 0, L * 0.48, 0, Math.PI * 2); ctx.fill();
  }
  // 1. floor
  ctx.fillStyle = (look.floorDamage ?? 0) > 0.15 ? "#7c2d12" : "#080b11";
  ctx.beginPath(); ctx.roundRect(xR + 0.1, -W * 0.36, xF - xR - 0.35, W * 0.72, 0.3); ctx.fill();
  // 2. wishbones to the wheel centres
  const yF = s.trackF / 2, yR = s.trackR / 2;
  ctx.strokeStyle = "#64748b"; ctx.lineWidth = 0.05; ctx.beginPath();
  for (const sg of [1, -1]) {
    ctx.moveTo(xF - 0.29, 0); ctx.lineTo(xF, sg * yF); ctx.moveTo(xF - 0.67, 0); ctx.lineTo(xF, sg * yF);
    ctx.moveTo(xR + 0.29, 0); ctx.lineTo(xR, sg * yR); ctx.moveTo(xR - 0.19, 0); ctx.lineTo(xR, sg * yR);
  }
  ctx.stroke();
  // 3. tyres at real size
  const wheel = (wx: number, wy: number, d: number, w: number) => {
    ctx.fillStyle = (look.treadContam ?? 0) > 0.25 ? "#4a3519" : "#090d14";
    ctx.beginPath(); ctx.roundRect(wx - d / 2, wy - w / 2, d, w, 0.06); ctx.fill();
    ctx.strokeStyle = look.tyreColor; ctx.lineWidth = 0.05;
    ctx.strokeRect(wx - d * 0.36, wy - w * 0.35, d * 0.72, w * 0.7);
  };
  for (const sg of [1, -1]) { wheel(xF, sg * yF, s.tyreF.d, s.tyreF.w); wheel(xR, sg * yR, s.tyreR.d, s.tyreR.w); }
  // 4. sidepods (each side can carry its own colour, e.g. Cadillac's two-sided livery)
  const pod = (sg: number) => [[L * 0.10, 0], [L * 0.10, sg * W * 0.16], [L * 0.04, sg * W * 0.34], [-L * 0.26, sg * W * 0.28], [-L * 0.36, sg * W * 0.12], [-L * 0.36, 0]];
  ctx.fillStyle = t.sidepodR ?? t.sidepod; poly(pod(1));
  ctx.fillStyle = t.sidepodL ?? t.sidepod; poly(pod(-1));
  // 5. monocoque and nose, engine cover behind the cockpit
  ctx.fillStyle = t.body;
  poly([[L * 0.50, 0], [L * 0.44, W * 0.06], [L * 0.14, W * 0.14], [-L * 0.12, W * 0.17], [-L * 0.44, W * 0.07],
        [-L * 0.44, -W * 0.07], [-L * 0.12, -W * 0.17], [L * 0.14, -W * 0.14], [L * 0.44, -W * 0.06]]);
  if (t.engineCover && t.engineCover !== t.body) {
    ctx.fillStyle = t.engineCover; poly([[-L * 0.10, W * 0.165], [-L * 0.44, W * 0.07], [-L * 0.44, -W * 0.07], [-L * 0.10, -W * 0.165]]);
  }
  if (t.accent) {                                         // livery stripe along the spine
    ctx.fillStyle = t.accent; ctx.fillRect(-L * 0.42, -0.03, L * 0.80, 0.06);
  }
  if (t.noseTip) { ctx.fillStyle = t.noseTip; poly([[L * 0.50, 0], [L * 0.39, W * 0.06], [L * 0.39, -W * 0.06]]); }
  // 6. front wing (2026: 100 mm narrower than 2022, still nearly full width)
  ctx.fillStyle = (look.wingDamage ?? 0) > 0.18 ? "#ff1801" : t.wing;
  poly([[L * 0.47, 0], [L * 0.42, W * 0.44], [L * 0.36, W * 0.44], [L * 0.40, 0], [L * 0.36, -W * 0.44], [L * 0.42, -W * 0.44]]);
  if (t.accent) { ctx.fillStyle = t.accent; ctx.fillRect(L * 0.355, W * 0.40, L * 0.07, W * 0.05); ctx.fillRect(L * 0.355, -W * 0.45, L * 0.07, W * 0.05); }
  // race number on the nose
  if (look.number !== undefined) {
    ctx.save(); ctx.translate(L * 0.30, 0); ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 0.26px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(look.number), 0, 0); ctx.restore();
  }
  // 7. cockpit, halo, helmet, T-camera
  if (t.cockpit) { ctx.fillStyle = t.cockpit; ctx.beginPath(); ctx.ellipse(-L * 0.035, 0, L * 0.14, W * 0.16, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#05070b"; ctx.beginPath(); ctx.ellipse(-L * 0.03, 0, L * 0.09, W * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = t.halo; ctx.lineWidth = 0.05; ctx.beginPath(); ctx.moveTo(L * 0.06, 0); ctx.lineTo(L * 0.035, W * 0.075);
  ctx.moveTo(L * 0.06, 0); ctx.lineTo(L * 0.035, -W * 0.075); ctx.stroke();
  const h: Helmet = typeof look.helmet === "string" ? { base: look.helmet, second: look.helmet, accent: look.helmet } : look.helmet;
  const hr = W * 0.075, hx = -L * 0.04;
  ctx.fillStyle = h.base; ctx.beginPath(); ctx.arc(hx, 0, hr, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(hx, 0, hr, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = h.second; ctx.fillRect(hx - hr, -hr * 0.32, hr * 2, hr * 0.64);           // stripe front to back
  ctx.fillStyle = h.accent; ctx.fillRect(hx + hr * 0.45, -hr, hr * 0.55, hr * 2);           // visor-side band
  ctx.restore();
  ctx.fillStyle = TCAM[look.tcam ?? "black"];                                                // T-cam on the airbox
  ctx.fillRect(-L * 0.135, -0.07, 0.2, 0.14);
  // 8. rear wing, coloured by aero mode
  const isX = look.aeroMode === "X" || look.aeroMode === "MOM";
  ctx.fillStyle = look.aeroMode === "S-CLIP" ? "#ef4444" : look.aeroMode === "CLIP" ? "#f59e0b" : isX ? "#00f0ff" : (t.rearWing ?? t.wing);
  ctx.beginPath(); ctx.roundRect(-L * 0.49, -W * 0.38, L * 0.09, W * 0.76, 0.15); ctx.fill();
}
