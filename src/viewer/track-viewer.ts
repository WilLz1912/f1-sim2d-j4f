// Track viewer: draws data/tracks/barcelona/track.json + surface.png so the geometry can be checked by eye.
import { drawCar, type CarShape, type Livery } from "../render/car";

// The surface layer is rendered once into an offscreen canvas; each frame only blits it and draws vectors.

interface Track {
  name: string; length_m: number; fia_length_m: number; origin_utm31n: [number, number];
  sources: Record<string, string>;
  stations: { ds: number; count: number; x: number[]; y: number[]; w_left: number[]; w_right: number[];
    kerb_left: number[]; kerb_right: number[]; barrier_left: number[]; barrier_right: number[] };
  corners: { n: number; name: string; dir: string; apex_s: number; radius_m: number; xy: [number, number] }[];
  lines: { id: string; s: number; src: string }[];
  straight_mode: { from: number; to: number; name: string }[];
  pit: { path: [number, number][]; length_m: number; limit_from: number; limit_to: number; boxes: { team: string; stop_xy: [number, number]; garage_xy: [number, number] }[] };
  grid: { pos: number; xy: [number, number] }[];
  structures: { kind: string; name: string; pts: [number, number][] }[];
  surface: { file: string; res_m: number; x0: number; y1: number; w: number; h: number; codes: Record<string, number> };
}

const SURFACE_COLORS: Record<string, string> = {
  none: "#1a1d1a", track: "#3a3d42", kerb: "#d62828", asphalt: "#6b6e73", paint: "#2fb37a", grass: "#4f7a35",
  gravel: "#cdb98a", pit: "#4a4458", barrier: "#f2f2f2", building: "#5b4636", dirt: "#8c7d64", obstacle: "#24361f",
};
const TEAM_COLORS: Record<string, string> = {
  mclaren: "#FF8000", mercedes: "#00F5D4", ferrari: "#E80020", redbull: "#3671C6", williams: "#005AFF", alpine: "#FF5CA8",
  vcarb: "#6692FF", haas: "#B6BABD", aston: "#229971", audi: "#F50537", cadillac: "#D4AF37",
};

const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const view = { x: 0, y: 0, z: 0.6 };   // world point at screen centre, pixels per metre

let T: Track;
interface Cars { teams: Record<string, { code3: string; length_mm: { v: number }; wheelbase_mm: { v: number }; width_mm: { v: number }; livery: Livery; physics: { track_front_mm: number; track_rear_mm: number } }>;
  regs: { tyre_front: { width_mm: number; diameter_mm: number }; tyre_rear: { width_mm: number; diameter_mm: number } };
  drivers: { code: string; team: string; helmet: string }[] }
let CARS: Cars | null = null;
let gridOrder: string[] = [];
let surfaceCanvas: HTMLCanvasElement | null = null;
let photo: HTMLImageElement | null = null;
let photoMeta: { x0: number; y1: number; res_m: number } | null = null;

const base = "/data/tracks/barcelona/";
async function load() {
  T = await (await fetch(base + "track.json")).json();
  const img = new Image(); img.src = base + T.surface.file; await img.decode();
  surfaceCanvas = colorize(img);
  const qp = new URLSearchParams(location.search);   // ?x=..&y=..&z=.. opens the view at a place
  if (qp.has("x")) { view.x = +qp.get("x")!; view.y = +qp.get("y")!; view.z = +(qp.get("z") ?? 4); }
  CARS = await (await fetch("/data/cars/cars_2026.json")).json();
  const q: Record<string, { lap: number }> = await (await fetch("/data/cars/barcelona_2026_q_targets.json")).json();
  gridOrder = Object.entries(q).sort((a, b) => a[1].lap - b[1].lap).map(e => e[0]);   // real 2026 qualifying order
  if (!qp.has("x")) { view.x = T.stations.x.reduce((a, b) => a + b, 0) / T.stations.count; view.y = T.stations.y.reduce((a, b) => a + b, 0) / T.stations.count; }
  document.getElementById("stats")!.innerHTML =
    `Dài tâm đường: <b>${T.length_m.toFixed(0)} m</b> (FIA ${T.fia_length_m} m)<br>` +
    `Rộng mặt đường: ${median(T.stations.w_left.map((l, i) => l + T.stations.w_right[i])).toFixed(1)} m (trung vị)<br>` +
    `Pit lane: ${T.pit.length_m.toFixed(0)} m, giới hạn 80 km/h trên ${(T.pit.limit_to - T.pit.limit_from).toFixed(0)} m<br>` +
    `Kerb: ${(T.stations.kerb_left.filter(v => v > 0).length + T.stations.kerb_right.filter(v => v > 0).length)} m`;
  document.getElementById("credits")!.textContent = Object.values(T.sources).slice(0, 4).join(" · ");
  // optional orthophoto (not in git; tools/track/ortho_fetch.py downloads it)
  try {
    photoMeta = await (await fetch("/data/imagery/catalunya_ortho_25cm.json")).json();
    const p = new Image(); p.src = "/data/imagery/catalunya_ortho_25cm.jpg"; p.decode().then(() => { photo = p; draw(); });
  } catch { $("lyrPhoto").disabled = true; }
  resize();
}

function median(a: number[]) { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; }

function colorize(img: HTMLImageElement) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const lut: number[][] = [];
  for (const [k, v] of Object.entries(T.surface.codes)) {
    const h = SURFACE_COLORS[k] ?? "#000"; lut[v] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  for (let i = 0; i < d.data.length; i += 4) {
    const col = lut[d.data[i]] ?? [0, 0, 0];   // PNG is 8-bit grey: code in every channel
    d.data[i] = col[0]; d.data[i + 1] = col[1]; d.data[i + 2] = col[2]; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0); return c;
}

// world (x east, y north) -> screen
function sx(x: number) { return (x - view.x) * view.z + canvas.width / 2; }
function sy(y: number) { return -(y - view.y) * view.z + canvas.height / 2; }

function stationPt(i: number, off: number): [number, number] {
  const st = T.stations, n = st.count, a = (i - 1 + n) % n, b = (i + 1) % n;
  const tx = st.x[b] - st.x[a], ty = st.y[b] - st.y[a], l = Math.hypot(tx, ty);
  return [st.x[i] - (ty / l) * off, st.y[i] + (tx / l) * off];   // +off = left of travel
}
function sToIndex(s: number) { const n = T.stations.count; return ((Math.round(s / T.stations.ds) % n) + n) % n; }

function polyline(pts: [number, number][], close = false) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y)))); if (close) ctx.closePath();
}
function offsetLine(fn: (i: number) => number, from = 0, to = T.stations.count) {
  const pts: [number, number][] = []; for (let i = from; i <= to; i++) pts.push(stationPt(i % T.stations.count, fn(i % T.stations.count))); return pts;
}
function crossLine(s: number, color: string, label: string, width = 2) {
  const i = sToIndex(s), st = T.stations;
  const a = stationPt(i, st.w_left[i] + 2), b = stationPt(i, -st.w_right[i] - 2);
  ctx.strokeStyle = color; ctx.lineWidth = width; polyline([a, b]); ctx.stroke();
  if (view.z > 0.8) { ctx.fillStyle = color; ctx.font = "11px system-ui"; ctx.fillText(label, sx(a[0]) + 4, sy(a[1]) - 4); }
}

function draw() {
  if (!T) return;
  const W = canvas.width, H = canvas.height, st = T.stations;
  ctx.fillStyle = "#0b0d10"; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = view.z < 2;
  if ($("lyrPhoto").checked && photo && photoMeta) {
    const ox = photoMeta.x0 - T.origin_utm31n[0], oy = photoMeta.y1 - T.origin_utm31n[1];
    ctx.drawImage(photo, sx(ox), sy(oy), photo.width * photoMeta.res_m * view.z, photo.height * photoMeta.res_m * view.z);
  } else if ($("lyrSurface").checked && surfaceCanvas) {
    const s = T.surface; ctx.drawImage(surfaceCanvas, sx(s.x0), sy(s.y1), s.w * s.res_m * view.z, s.h * s.res_m * view.z);
  }
  // track edges
  ctx.lineWidth = 1; ctx.strokeStyle = "#ffffff";
  polyline(offsetLine(i => st.w_left[i]), true); ctx.stroke();
  polyline(offsetLine(i => -st.w_right[i]), true); ctx.stroke();
  if ($("lyrBarrier").checked) {
    ctx.strokeStyle = "#ff3df2"; ctx.lineWidth = Math.max(1, 0.8 * view.z);
    polyline(offsetLine(i => st.barrier_left[i]), true); ctx.stroke();
    polyline(offsetLine(i => -st.barrier_right[i]), true); ctx.stroke();
  }
  if ($("lyrLines").checked) {
    // straight mode zones: blue band along the centreline
    ctx.strokeStyle = "rgba(56,189,248,0.55)"; ctx.lineWidth = Math.max(2, 3 * view.z);
    for (const z of T.straight_mode) {
      const a = sToIndex(z.from), b0 = sToIndex(z.to), b = b0 < a ? b0 + st.count : b0;
      polyline(offsetLine(() => 0, a, b)); ctx.stroke();
    }
    const col: Record<string, string> = { control: "#ffffff", sector1: "#facc15", sector2: "#facc15", speed_trap: "#a78bfa", i1: "#a78bfa", i2: "#a78bfa",
      overtake_detection: "#22d3ee", overtake_activation: "#22d3ee", sc1: "#f59e0b", sc2: "#f59e0b", pit_entry: "#f472b6", pit_exit: "#f472b6", t1_braking_ref: "#ef4444" };
    for (const l of T.lines) crossLine(l.s, col[l.id] ?? "#fff", l.id, l.id === "control" ? 4 : 2);
    ctx.font = "bold 13px system-ui";
    for (const c of T.corners) {
      const i = sToIndex(c.apex_s), side = c.dir === "L" ? -1 : 1;   // label on the outside
      const p = stationPt(i, side * (c.dir === "L" ? st.w_right[i] : st.w_left[i]) + side * 14);
      ctx.fillStyle = "#fde047"; ctx.fillText(`T${c.n}`, sx(p[0]) - 8, sy(p[1]) + 4);
    }
  }
  if ($("lyrPit").checked) {
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.5; polyline(T.pit.path); ctx.stroke();
    for (const b of T.pit.boxes) {
      ctx.fillStyle = TEAM_COLORS[b.team] ?? "#fff";
      ctx.beginPath(); ctx.arc(sx(b.stop_xy[0]), sy(b.stop_xy[1]), Math.max(2, 1.2 * view.z), 0, 7); ctx.fill();
      if (view.z > 1.5) { ctx.font = "10px system-ui"; ctx.fillText(b.team, sx(b.garage_xy[0]), sy(b.garage_xy[1])); }
    }
    ctx.fillStyle = "#ffffff";
    for (const g of T.grid) {
      ctx.fillRect(sx(g.xy[0]) - 1.5, sy(g.xy[1]) - 1.5, 3, 3);
      if (view.z > 3) { ctx.font = "10px system-ui"; ctx.fillText(String(g.pos), sx(g.xy[0]) + 4, sy(g.xy[1])); }
    }
  }
  if ($("lyrCars").checked && CARS) drawGridCars();
  if ($("lyrNames").checked && view.z > 0.9) {
    ctx.font = "11px system-ui"; ctx.fillStyle = "#e5e7eb";
    for (const s of T.structures) {
      if (!s.name || (s.kind !== "grandstand" && s.kind !== "building")) continue;
      const cx = s.pts.reduce((a, p) => a + p[0], 0) / s.pts.length, cy = s.pts.reduce((a, p) => a + p[1], 0) / s.pts.length;
      ctx.fillText(s.name, sx(cx), sy(cy));
    }
  }
}

function drawGridCars() {
  const C = CARS!;
  gridOrder.forEach((code, k) => {
    const g = T.grid[k], d = C.drivers.find(x => x.code === code); if (!g || !d) return;
    const tm = C.teams[d.team], i = sToIndex((T.grid[k] as unknown as { s: number }).s), st = T.stations, n = st.count;
    const hd = Math.atan2(st.y[(i + 1) % n] - st.y[(i - 1 + n) % n], st.x[(i + 1) % n] - st.x[(i - 1 + n) % n]);
    const shape: CarShape = { length: tm.length_mm.v / 1000, width: tm.width_mm.v / 1000, wheelbase: tm.wheelbase_mm.v / 1000,
      tyreF: { w: C.regs.tyre_front.width_mm / 1000, d: C.regs.tyre_front.diameter_mm / 1000 },
      tyreR: { w: C.regs.tyre_rear.width_mm / 1000, d: C.regs.tyre_rear.diameter_mm / 1000 },
      trackF: tm.physics.track_front_mm / 1000, trackR: tm.physics.track_rear_mm / 1000 };
    ctx.save(); ctx.translate(sx(g.xy[0]), sy(g.xy[1])); ctx.scale(view.z, view.z); ctx.rotate(-hd);
    drawCar(ctx, shape, { livery: tm.livery, helmet: d.helmet, tyreColor: "#ef4444" }); ctx.restore();
    if (view.z > 4) { ctx.fillStyle = "#fff"; ctx.font = "11px system-ui"; ctx.fillText(`P${k + 1} ${code}`, sx(g.xy[0]) + 3 * view.z, sy(g.xy[1]) - 2 * view.z); }
  });
}

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; draw(); }
addEventListener("resize", resize);
let drag: { x: number; y: number } | null = null;
canvas.addEventListener("mousedown", e => (drag = { x: e.clientX, y: e.clientY }));
addEventListener("mouseup", () => (drag = null));
window.addEventListener("mousemove", (e: MouseEvent) => {
  const wx = view.x + (e.clientX - canvas.width / 2) / view.z, wy = view.y - (e.clientY - canvas.height / 2) / view.z;
  if (T) {
    let best = 0, bd = 1e18;
    for (let i = 0; i < T.stations.count; i += 1) { const d = (T.stations.x[i] - wx) ** 2 + (T.stations.y[i] - wy) ** 2; if (d < bd) { bd = d; best = i; } }
    const st = T.stations;
    document.getElementById("info")!.textContent =
      `s = ${(best * st.ds).toFixed(0)} m · rộng ${(st.w_left[best] + st.w_right[best]).toFixed(1)} m · kerb T/P ${st.kerb_left[best].toFixed(1)}/${st.kerb_right[best].toFixed(1)} m · rào T/P ${st.barrier_left[best].toFixed(0)}/${st.barrier_right[best].toFixed(0)} m · ${(view.z).toFixed(2)} px/m`;
  }
  if (!drag) return;
  view.x -= (e.clientX - drag.x) / view.z; view.y += (e.clientY - drag.y) / view.z; drag = { x: e.clientX, y: e.clientY }; draw();
});
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const k = Math.exp(-e.deltaY * 0.0015), mx = e.clientX - canvas.width / 2, my = e.clientY - canvas.height / 2;
  const wx = view.x + mx / view.z, wy = view.y - my / view.z;
  view.z = Math.min(40, Math.max(0.2, view.z * k)); view.x = wx - mx / view.z; view.y = wy + my / view.z; draw();
}, { passive: false });
for (const id of ["lyrCars", "lyrPhoto", "lyrSurface", "lyrLines", "lyrPit", "lyrBarrier", "lyrNames"]) $(id).addEventListener("change", draw);
load();
