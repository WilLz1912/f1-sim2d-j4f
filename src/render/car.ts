// F1 2026 car, top view. Shapes are Argon's V11 drawF1Car2026; V12 places the axles and tyres at the real
// dimensions of each car (length, wheelbase, tyre sizes from data/cars/cars_2026.json). Units: metres,
// origin at the car's centre, +x forward, +y left.

export interface Livery { body: string; sidepod: string; wing: string; halo: string; noseTip?: string }
export interface CarShape {
  length: number; width: number; wheelbase: number;
  tyreF: { w: number; d: number }; tyreR: { w: number; d: number };
  trackF: number; trackR: number;
}
export interface CarLook {
  livery: Livery; helmet: string; tyreColor: string;
  aeroMode?: "Z" | "X" | "MOM" | "CLIP" | "S-CLIP"; selected?: boolean;
  floorDamage?: number; wingDamage?: number; treadContam?: number;
}

export function drawCar(ctx: CanvasRenderingContext2D, s: CarShape, look: CarLook) {
  const L = s.length, W = s.width, t = look.livery;
  const xF = L * 0.30, xR = xF - s.wheelbase;            // axle positions (V11 had the front axle at 0.30 L)

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
  // 4. sidepods
  ctx.fillStyle = t.sidepod; ctx.beginPath();
  ctx.moveTo(L * 0.10, W * 0.16); ctx.lineTo(L * 0.04, W * 0.34); ctx.lineTo(-L * 0.26, W * 0.28); ctx.lineTo(-L * 0.36, W * 0.12);
  ctx.lineTo(-L * 0.36, -W * 0.12); ctx.lineTo(-L * 0.26, -W * 0.28); ctx.lineTo(L * 0.04, -W * 0.34); ctx.lineTo(L * 0.10, -W * 0.16);
  ctx.closePath(); ctx.fill();
  // 5. monocoque and nose
  ctx.fillStyle = t.body; ctx.beginPath();
  ctx.moveTo(L * 0.50, 0); ctx.lineTo(L * 0.44, W * 0.06); ctx.lineTo(L * 0.14, W * 0.14); ctx.lineTo(-L * 0.12, W * 0.17); ctx.lineTo(-L * 0.44, W * 0.07);
  ctx.lineTo(-L * 0.44, -W * 0.07); ctx.lineTo(-L * 0.12, -W * 0.17); ctx.lineTo(L * 0.14, -W * 0.14); ctx.lineTo(L * 0.44, -W * 0.06);
  ctx.closePath(); ctx.fill();
  if (t.noseTip) {
    ctx.fillStyle = t.noseTip; ctx.beginPath();
    ctx.moveTo(L * 0.50, 0); ctx.lineTo(L * 0.39, W * 0.06); ctx.lineTo(L * 0.39, -W * 0.06); ctx.closePath(); ctx.fill();
  }
  // 6. front wing (2026: 100 mm narrower than 2022, still nearly full width)
  ctx.fillStyle = (look.wingDamage ?? 0) > 0.18 ? "#ff1801" : t.wing; ctx.beginPath();
  ctx.moveTo(L * 0.47, 0); ctx.lineTo(L * 0.42, W * 0.44); ctx.lineTo(L * 0.36, W * 0.44); ctx.lineTo(L * 0.40, 0);
  ctx.lineTo(L * 0.36, -W * 0.44); ctx.lineTo(L * 0.42, -W * 0.44); ctx.closePath(); ctx.fill();
  // 7. cockpit and helmet
  ctx.fillStyle = "#05070b"; ctx.beginPath(); ctx.ellipse(-L * 0.03, 0, L * 0.09, W * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = look.helmet; ctx.beginPath(); ctx.arc(-L * 0.04, 0, W * 0.075, 0, Math.PI * 2); ctx.fill();
  // 8. rear wing, coloured by aero mode
  const isX = look.aeroMode === "X" || look.aeroMode === "MOM";
  ctx.fillStyle = look.aeroMode === "S-CLIP" ? "#ef4444" : look.aeroMode === "CLIP" ? "#f59e0b" : isX ? "#00f0ff" : t.wing;
  ctx.beginPath(); ctx.roundRect(-L * 0.49, -W * 0.38, L * 0.09, W * 0.76, 0.15); ctx.fill();
}
