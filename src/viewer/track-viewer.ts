// Track viewer: the game look (TrackRenderer, V11 palette) on the real Barcelona geometry, plus 22 cars on the
// grid. Debug layers: the satellite photo and the physics surface map, both off by default.
import { drawCarCached, type CarShape, type Livery, type Helmet } from "../render/car";
import { TrackRenderer, type TrackData, type RenderData, type View } from "../render/track";

interface Track extends TrackData {
  length_m: number; fia_length_m: number; origin_utm31n: [number, number]; sources: Record<string, string>;
  pit: TrackData["pit"] & { length_m: number };
  surface: { file: string; res_m: number; x0: number; y1: number; w: number; h: number; codes: Record<string, number> };
}
interface Cars {
  teams: Record<string, { code3: string; length_mm: { v: number }; wheelbase_mm: { v: number }; width_mm: { v: number }; livery: Livery;
    physics: { track_front_mm: number; track_rear_mm: number } }>;
  regs: { tyre_front: { width_mm: number; diameter_mm: number }; tyre_rear: { width_mm: number; diameter_mm: number } };
  drivers: { code: string; num: number; team: string; helmet: Helmet; tcam: "black" | "yellow" }[];
}
const SURFACE_COLORS: Record<string, string> = {
  none: "#000000", track: "#3a3d42", kerb: "#d62828", asphalt: "#6b6e73", paint: "#2fb37a", grass: "#4f7a35",
  gravel: "#cdb98a", pit: "#4a4458", barrier: "#f2f2f2", building: "#5b4636", dirt: "#8c7d64", obstacle: "#24361f",
};

const canvas = document.getElementById("c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const view: View = { x: 0, y: 0, z: 0.6 };
let T: Track, R: TrackRenderer, CARS: Cars, gridOrder: string[] = [];
let photo: HTMLImageElement | null = null, photoMeta: { x0: number; y1: number; res_m: number } | null = null;
let physMap: HTMLCanvasElement | null = null;
const avg = (a: number[]) => a.reduce((p, q) => p + q, 0) / a.length;

async function load() {
  const base = "/data/tracks/barcelona/";
  const j = async <X>(u: string) => (await fetch(u)).json() as Promise<X>;
  T = await j<Track>(base + "track.json");
  const render = await j<RenderData>(base + "render.json");
  CARS = await j<Cars>("/data/cars/cars_2026.json");
  const q = await j<Record<string, { lap: number }>>("/data/cars/barcelona_2026_q_targets.json");
  gridOrder = Object.entries(q).sort((a, b) => a[1].lap - b[1].lap).map(e => e[0]);     // real 2026 qualifying order
  const teams = Object.fromEntries(Object.entries(CARS.teams).map(([k, t]) => [k, { code3: t.code3, body: t.livery.primary }]));
  R = new TrackRenderer(T, render, teams);
  const qp = new URLSearchParams(location.search);                                        // ?x=..&y=..&z=.. opens at a place
  if (qp.has("x")) { view.x = +qp.get("x")!; view.y = +qp.get("y")!; view.z = +(qp.get("z") ?? 4); }
  else { view.x = avg(T.stations.x); view.y = avg(T.stations.y); }
  if (qp.has("photo")) { $("lyrPhoto").checked = true; ensurePhoto(); }
  if (qp.has("nocars")) $("lyrCars").checked = false;
  const med = (a: number[]) => [...a].sort((p, q2) => p - q2)[a.length >> 1];
  document.getElementById("stats")!.innerHTML =
    `Dài tâm đường: <b>${T.length_m.toFixed(0)} m</b> (FIA ${T.fia_length_m} m)<br>` +
    `Rộng mặt đường: ${med(T.stations.w_left.map((l, i) => l + T.stations.w_right[i])).toFixed(1)} m (trung vị)<br>` +
    `Pit lane: ${T.pit.length_m.toFixed(0)} m, giới hạn 80 km/h trên ${(T.pit.limit_to - T.pit.limit_from).toFixed(0)} m<br>` +
    `Kerb: ${T.stations.kerb_left.filter(v => v > 0).length + T.stations.kerb_right.filter(v => v > 0).length} m`;
  document.getElementById("credits")!.textContent = Object.values(T.sources).slice(0, 4).join(" · ");
  resize();
}

async function ensurePhoto() {
  if (photo) return draw();
  try {
    photoMeta = await (await fetch("/data/imagery/catalunya_ortho_25cm.json")).json();
    const p = new Image(); p.src = "/data/imagery/catalunya_ortho_25cm.jpg"; await p.decode(); photo = p; draw();
  } catch { $("lyrPhoto").checked = false; $("lyrPhoto").disabled = true; }
}
async function ensurePhysMap() {
  if (physMap) return draw();
  const img = new Image(); img.src = "/data/tracks/barcelona/" + T.surface.file; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d")!; g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height); const lut: number[][] = [];
  for (const [k, v] of Object.entries(T.surface.codes)) { const h = SURFACE_COLORS[k] ?? "#000"; lut[v] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
  for (let i = 0; i < d.data.length; i += 4) { const col = lut[d.data[i]] ?? [0, 0, 0]; d.data[i] = col[0]; d.data[i + 1] = col[1]; d.data[i + 2] = col[2]; }
  g.putImageData(d, 0, 0); physMap = c; draw();
}

function draw() {
  if (!R) return;
  R.drawCached(ctx, view, { structures: true, lines: $("lyrLines").checked, straightMode: $("lyrLines").checked, grid: $("lyrPit").checked });
  const sx = (x: number) => (x - view.x) * view.z + canvas.width / 2, sy = (y: number) => -(y - view.y) * view.z + canvas.height / 2;
  if ($("lyrPhoto").checked && photo && photoMeta) {
    ctx.globalAlpha = 0.85; const ox = photoMeta.x0 - T.origin_utm31n[0], oy = photoMeta.y1 - T.origin_utm31n[1];
    ctx.drawImage(photo, sx(ox), sy(oy), photo.width * photoMeta.res_m * view.z, photo.height * photoMeta.res_m * view.z); ctx.globalAlpha = 1;
  }
  if ($("lyrSurface").checked && physMap) {
    ctx.globalAlpha = 0.85; const s = T.surface; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(physMap, sx(s.x0), sy(s.y1), s.w * s.res_m * view.z, s.h * s.res_m * view.z); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true;
  }
  if ($("lyrCars").checked) drawGridCars();
  if ($("lyrNames").checked && view.z > 0.9) {
    ctx.font = "11px system-ui"; ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center";
    for (const s of T.structures) {
      if (!s.name || !["grandstand", "control_tower", "paddock"].includes(s.kind)) continue;
      ctx.fillText(s.name, sx(avg(s.pts.map(p => p[0]))), sy(avg(s.pts.map(p => p[1]))));
    }
    ctx.textAlign = "left";
  }
}

function drawGridCars() {
  R.worldTransform(ctx, view);
  gridOrder.forEach((code, k) => {
    const g = T.grid[k], d = CARS.drivers.find(x => x.code === code); if (!g || !d) return;
    const tm = CARS.teams[d.team], i = R.idx(g.s);
    const shape: CarShape = { length: tm.length_mm.v / 1000, width: tm.width_mm.v / 1000, wheelbase: tm.wheelbase_mm.v / 1000,
      tyreF: { w: CARS.regs.tyre_front.width_mm / 1000, d: CARS.regs.tyre_front.diameter_mm / 1000 },
      tyreR: { w: CARS.regs.tyre_rear.width_mm / 1000, d: CARS.regs.tyre_rear.diameter_mm / 1000 },
      trackF: tm.physics.track_front_mm / 1000, trackR: tm.physics.track_rear_mm / 1000 };
    ctx.save(); ctx.translate(g.xy[0], g.xy[1]); ctx.rotate(R.heading(i)); ctx.scale(1, -1);   // car art is drawn y-down
    drawCarCached(ctx, shape, { team: d.team, livery: tm.livery, helmet: d.helmet, tcam: d.tcam, number: d.num, tyreColor: "#ef4444" }, view.z); ctx.restore();
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (view.z > 4) {
    ctx.font = "bold 11px JetBrains Mono, monospace"; ctx.fillStyle = "#fff";
    gridOrder.forEach((code, k) => { const g = T.grid[k]; if (!g) return; const [x, y] = R.toScreen(ctx, view, g.xy[0], g.xy[1]); ctx.fillText(`P${k + 1} ${code}`, x + 3 * view.z, y - 2.2 * view.z); });
  }
}

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; draw(); }
addEventListener("resize", resize);
let drag: { x: number; y: number } | null = null;
canvas.addEventListener("mousedown", e => (drag = { x: e.clientX, y: e.clientY }));
addEventListener("mouseup", () => (drag = null));
window.addEventListener("mousemove", (e: MouseEvent) => {
  const wx = view.x + (e.clientX - canvas.width / 2) / view.z, wy = view.y - (e.clientY - canvas.height / 2) / view.z;
  if (T) {
    const st = T.stations; let best = 0, bd = 1e18;
    for (let i = 0; i < st.count; i++) { const d = (st.x[i] - wx) ** 2 + (st.y[i] - wy) ** 2; if (d < bd) { bd = d; best = i; } }
    document.getElementById("info")!.textContent =
      `s = ${(best * st.ds).toFixed(0)} m · rộng ${(st.w_left[best] + st.w_right[best]).toFixed(1)} m · kerb T/P ${st.kerb_left[best].toFixed(1)}/${st.kerb_right[best].toFixed(1)} m · rào T/P ${st.barrier_left[best].toFixed(0)}/${st.barrier_right[best].toFixed(0)} m · ${view.z.toFixed(2)} px/m`;
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
$("lyrPhoto").addEventListener("change", () => ($("lyrPhoto").checked ? ensurePhoto() : draw()));
$("lyrSurface").addEventListener("change", () => ($("lyrSurface").checked ? ensurePhysMap() : draw()));
for (const id of ["lyrCars", "lyrLines", "lyrPit", "lyrNames"]) $(id).addEventListener("change", draw);
load();
