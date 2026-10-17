// Physics lab: one 2026 car on the real Barcelona track, driven by the lab AI or by the keyboard, against the real
// fastest Q lap of a driver (ghost car + speed trace from OpenF1). Everything physical comes from src/sim.
import { TrackModel, type TrackJson, type SurfaceGrid } from "../sim/track";
import { buildCar, type CarsJson, type GearingJson, type PhysicsJson, type CarParams } from "../sim/car";
import { plan, type Profile } from "../sim/qss";
import { Vehicle, type Controls } from "../sim/vehicle";
import { LabDriver } from "../sim/driver";
import { DT, labPlan } from "../sim/lap";
import { TrackRenderer, type RenderData, type View, type TrackData } from "../render/track";
import { drawCarCached, type CarShape, type Livery, type Helmet } from "../render/car";

interface Cars extends CarsJson {
  teams: CarsJson["teams"] & Record<string, { car: string; code3: string; length_mm: { v: number }; width_mm: { v: number }; livery: Livery }>;
  drivers: { code: string; name: string; num: number; team: string; helmet: Helmet; tcam: "black" | "yellow" }[];
}
interface RefLap { team: string; num: number; lap: number; s1: number; s2: number; s3: number; t: number[]; v: number[]; thr: number[]; brk: number[]; gear: number[] }
interface Tel { ds: number; n: number; drivers: Record<string, RefLap> }

const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
const canvas = $<HTMLCanvasElement>("c"), ctx = canvas.getContext("2d")!;
const chart = $<HTMLCanvasElement>("chart"), cctx = chart.getContext("2d")!;
const gg = $<HTMLCanvasElement>("gg"), gctx = gg.getContext("2d")!;

let TJ: TrackJson & TrackData & { racing_line: { offset: number[] } }, trk: TrackModel, R: TrackRenderer;
let CARS: Cars, GEAR: GearingJson, PHYS: PhysicsJson | undefined, TEL: Tel;
let team = "mercedes", ghostCode = "RUS", P: CarParams, prof: Profile, car: Vehicle, ai: LabDriver;
let mode: "ai" | "key" = "ai", speedK = 1, paused = false, overview = false;
const CAM_Z = 9, view: View = { x: 0, y: 0, z: CAM_Z };
// lap bookkeeping (5 m bins like the telemetry)
const BIN = 5;
let nBins = 0, simT = 0, lapT0 = -1, prevS = 0, nextBin = 0, sectors: number[] = [];
let cur: { v: number[]; thr: number[]; brk: number[]; t: number[] } = { v: [], thr: [], brk: [], t: [] }, prevLap: typeof cur | null = null;
let best: { time: number; sectors: number[] } | null = null, last: { time: number; sectors: number[] } | null = null;
let lineHint = 0;
const skid: number[] = []; const SKID_MAX = 6000;
const trail: [number, number][] = [];

async function load() {
  const j = async <X>(u: string) => (await fetch(u)).json() as Promise<X>;
  const base = "/data/tracks/barcelona/";
  [TJ, CARS, GEAR, TEL] = await Promise.all([j<any>(base + "track.json"), j<Cars>("/data/cars/cars_2026.json"), j<GearingJson>("/data/cars/gearing_2026.json"), j<Tel>("/data/telemetry/barcelona_2026_q.json")]);
  PHYS = await j<PhysicsJson>("/data/cars/physics_2026.json").catch(() => undefined);
  const render = await j<RenderData>(base + "render.json");
  // surface map for the physics (grip under each wheel)
  const img = new Image(); img.src = base + TJ.surface.file; await img.decode();
  const sc = document.createElement("canvas"); sc.width = img.width; sc.height = img.height;
  const sg = sc.getContext("2d", { willReadFrequently: true })!; sg.drawImage(img, 0, 0);
  const px = sg.getImageData(0, 0, img.width, img.height).data, data = new Uint8Array(img.width * img.height);
  for (let i = 0; i < data.length; i++) data[i] = px[i * 4];
  const surf: SurfaceGrid = { data, w: img.width, h: img.height, x0: TJ.surface.x0, y1: TJ.surface.y1, res: TJ.surface.res_m };
  trk = new TrackModel(TJ, surf);
  R = new TrackRenderer(TJ, render, Object.fromEntries(Object.entries(CARS.teams).map(([k, t]) => [k, { code3: t.code3, body: t.livery.primary }])));
  R.cachePad = 0.7;
  nBins = Math.floor(trk.L / BIN);
  // team list in real qualifying order
  const order = Object.keys(CARS.teams).sort((a, b) => bestOf(a)[1].lap - bestOf(b)[1].lap);
  $<HTMLSelectElement>("team").innerHTML = order.map(k => `<option value="${k}">${CARS.teams[k].car}</option>`).join("");
  $<HTMLSelectElement>("ghostSel").innerHTML = Object.entries(TEL.drivers).sort((a, b) => a[1].lap - b[1].lap)
    .map(([c, d]) => `<option value="${c}">${c} ${d.lap.toFixed(3)}</option>`).join("");
  const q = new URLSearchParams(location.search);
  if (q.get("team") && CARS.teams[q.get("team")!]) team = q.get("team")!;
  $<HTMLSelectElement>("team").value = team;
  setTeam(team);
  if (q.get("speed")) { speedK = +q.get("speed")!; document.querySelectorAll<HTMLButtonElement>("button[data-k]").forEach(b => b.classList.toggle("on", +b.dataset.k! === speedK)); }
  if (q.get("z")) view.z = +q.get("z")!;
  if (q.has("forces")) $<HTMLInputElement>("lyrForces").checked = true;
  $("loading").style.display = "none";
  resize(); requestAnimationFrame(frame);
}
const bestOf = (tm: string) => Object.entries(TEL.drivers).filter(([, d]) => d.team === tm).sort((a, b) => a[1].lap - b[1].lap)[0];

function setTeam(tm: string) {
  team = tm; ghostCode = bestOf(tm)[0]; $<HTMLSelectElement>("ghostSel").value = ghostCode;
  // a team without its own fit yet drives with the reference (fitted) car parameters
  const own = !!PHYS?.teams[tm], fit: PhysicsJson | undefined = PHYS && (own ? PHYS : { base: PHYS.base, teams: { [tm]: PHYS.teams.mercedes ?? {} } });
  P = buildCar(tm, CARS, GEAR, fit);
  prof = plan(trk, P, labPlan(P));
  const f = fit?.teams[tm];
  $("carNote").innerHTML = (own ? `Thông số khí động, độ bám, ICE <b>khớp với vòng thật ${ghostCode}</b>` : `Chưa khớp riêng: dùng thông số của xe Mercedes (khớp với RUS)`) +
    (f ? `: μ ${f.mu?.toFixed(2)}, ClA ${f.claZ?.toFixed(2)} m², CdA ${f.cdaZ?.toFixed(2)} / ${f.cdaX?.toFixed(2)} m² (Z/X), ICE ${f.ice?.toFixed(0)} kW.` : ".") +
    ` Kế hoạch năng lượng: sạc khi đạp hết ga ${(prof.clip / 1e3).toFixed(0)} kW trong ${prof.dClip.toFixed(0)} m trước điểm phanh.` +
    ` Khối lượng ${P.mass.toFixed(0)} kg, số đo từ telemetry.`;
  $("lgSim").style.background = CARS.teams[tm].livery.primary === "#0C0C0E" ? CARS.teams[tm].livery.accent ?? "#00d7b6" : CARS.teams[tm].livery.primary;
  buildPlanPaths(); restart();
}

function restart() {
  car = new Vehicle(P, trk); ai = new LabDriver(trk, prof);
  let k0 = 0; while (trk.lsc[k0] < 3900) k0++;
  car.place(trk.lx[k0], trk.ly[k0], trk.lh[k0], prof.v[k0]); lineHint = k0;
  simT = 0; lapT0 = -1; prevS = car.s; nextBin = 0; sectors = []; cur = { v: [], thr: [], brk: [], t: [] }; prevLap = null; best = null; last = null;
  skid.length = 0; trail.length = 0; keyCtl.steer = keyCtl.thr = keyCtl.brk = 0;
  updateTimes();
}

// ---------------- keyboard driving ----------------
const keys = new Set<string>();
window.addEventListener("keydown", (e: KeyboardEvent) => { if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault(); keys.add(e.key.toLowerCase()); });
window.addEventListener("keyup", (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));
const keyCtl = { steer: 0, thr: 0, brk: 0, thrCap: 1, brkCap: 1 };
function keyControls(dt: number): Controls {
  const k = (...a: string[]) => a.some(x => keys.has(x));
  const v = Math.max(car.vx, 0), left = k("arrowleft", "a"), right = k("arrowright", "d");
  const target = (left ? 1 : 0) - (right ? 1 : 0), scale = Math.min(1, Math.max(0.12, 14 / (v + 8)));   // less lock at speed
  keyCtl.steer += Math.max(-3 * dt, Math.min(3 * dt, target * scale - keyCtl.steer));
  keyCtl.thr = k("arrowup", "w") ? Math.min(1, keyCtl.thr + 3 * dt) : Math.max(0, keyCtl.thr - 6 * dt);
  keyCtl.brk = k("arrowdown", "s") ? Math.min(1, keyCtl.brk + 5 * dt) : Math.max(0, keyCtl.brk - 8 * dt);
  let thr = keyCtl.thr, brk = keyCtl.brk;
  lineHint = trk.linePoint(car.x, car.y, lineHint);
  if ($<HTMLInputElement>("assist").checked) {     // the same "feel" the AI has: no wheelspin, no lock-up
    const w = car.w;
    keyCtl.thrCap = w[2].slide || w[3].slide ? Math.max(0.2, keyCtl.thrCap - 4 * dt) : Math.min(1, keyCtl.thrCap + 1.5 * dt);
    keyCtl.brkCap = w[0].slide || w[1].slide ? Math.max(0.3, keyCtl.brkCap - 5 * dt) : Math.min(1, keyCtl.brkCap + 2 * dt);
    thr = Math.min(thr, keyCtl.thrCap); brk = Math.min(brk, keyCtl.brkCap);
  }
  const modeX = !!trk.straightMode[car.idx] && thr > 0.98 && brk === 0 && ($<HTMLInputElement>("assist").checked || k(" "));
  return { steer: keyCtl.steer, throttle: thr, brake: brk, kTarget: prof.kp[lineHint], modeX };
}

// ---------------- simulation ----------------
let lastC: Controls = { steer: 0, throttle: 0, brake: 0, kTarget: 0, modeX: false };
function stepSim() {
  const c = mode === "ai" ? ai.control(car, DT) : keyControls(DT);
  lastC = c; car.step(DT, c); simT += DT;
  const s = car.s, L = trk.L;
  const crossed = prevS > L - 200 && s < 200;
  if (crossed) {
    if (lapT0 >= 0 && sectors.length === 2) {
      const time = simT - lapT0; const secs = [sectors[0], sectors[1] - sectors[0], time - sectors[1]];
      while (cur.v.length < nBins) { cur.v.push(car.vx * 3.6); cur.thr.push(c.throttle * 100); cur.brk.push(c.brake * 100); cur.t.push(time); }
      last = { time, sectors: secs }; if (!best || time < best.time) best = last; prevLap = cur;
    }
    lapT0 = simT; sectors = []; nextBin = 0; cur = { v: [], thr: [], brk: [], t: [] };
    car.soc = P.pt.esJ; car.harvestedLap = 0; car.deployedLap = 0;       // quali: every lap starts with a charged store
    updateTimes();
  } else if (lapT0 >= 0) {
    const s1 = trk.sAt("sector1"), s2 = trk.sAt("sector2");
    if (sectors.length === 0 && prevS < s1 && s >= s1) { sectors.push(simT - lapT0); updateTimes(); }
    if (sectors.length === 1 && prevS < s2 && s >= s2) { sectors.push(simT - lapT0); updateTimes(); }
    while (nextBin < nBins && s >= nextBin * BIN && s < L - 50 && s - nextBin * BIN < 60) {
      cur.v.push(car.vx * 3.6); cur.thr.push(c.throttle * 100); cur.brk.push(c.brake * 100); cur.t.push(simT - lapT0); nextBin++;
    }
  }
  prevS = s;
  for (let k = 0; k < 4; k++) if (car.w[k].slide || car.w[k].use > 1.02) {           // tyre marks where a wheel slides
    const cs = Math.cos(car.psi), sn = Math.sin(car.psi), x = k < 2 ? P.a : -P.b, y = (k % 2 ? -1 : 1) * (k < 2 ? P.tf : P.tr) / 2;
    skid.push(car.x + x * cs - y * sn, car.y + x * sn + y * cs); if (skid.length > SKID_MAX) skid.splice(0, 2);
  }
  if (car.crashed && !crashPending) { crashPending = true; setTimeout(() => { crashPending = false; if (car.crashed) restart(); }, 1500); }
}
let crashPending = false;

let acc = 0, lastTs = 0, frameN = 0;
function frame(ts: number) {
  const dtR = Math.min(0.1, (ts - (lastTs || ts)) / 1000); lastTs = ts;
  if (!paused && !car.crashed) { acc += dtR * speedK; let n = 0; while (acc >= DT && n < 4000) { stepSim(); acc -= DT; n++; } }
  else acc = 0;
  draw(); frameN++;
  if (frameN % 2 === 0) hud();
  if (frameN % 5 === 0) drawChart();
  requestAnimationFrame(frame);
}

// ---------------- drawing ----------------
let planPaths: { col: string; p: Path2D }[] = [];
function speedCol(kmh: number) {                       // 80 km/h blue -> 340 km/h red
  const t = Math.max(0, Math.min(1, (kmh - 80) / 260)), h = 220 - 220 * t; return `hsl(${h},85%,55%)`;
}
function buildPlanPaths() {
  const B = 14, ps = Array.from({ length: B }, () => new Path2D());
  for (let k = 0; k < trk.ln; k += 2) {
    const k2 = (k + 2) % trk.ln, b = Math.min(B - 1, Math.max(0, Math.floor((prof.v[k] * 3.6 - 80) / 260 * B)));
    ps[b].moveTo(trk.lx[k], trk.ly[k]); ps[b].lineTo(trk.lx[k2], trk.ly[k2]);
  }
  planPaths = ps.map((p, b) => ({ p, col: speedCol(80 + (b + 0.5) * 260 / B) }));
}
function shapeOf(tm: string): CarShape {
  const t = CARS.teams[tm] as any;
  return { length: t.length_mm.v / 1000, width: t.width_mm.v / 1000, wheelbase: t.wheelbase_mm.v / 1000,
    tyreF: { w: CARS.regs.tyre_front.width_mm / 1000, d: CARS.regs.tyre_front.diameter_mm / 1000 },
    tyreR: { w: CARS.regs.tyre_rear.width_mm / 1000, d: CARS.regs.tyre_rear.diameter_mm / 1000 },
    trackF: t.physics.track_front_mm / 1000, trackR: t.physics.track_rear_mm / 1000 };
}
function ghostPose(): { x: number; y: number; h: number; s: number } | null {
  const ref = TEL.drivers[ghostCode]; if (lapT0 < 0) return null;
  const tau = simT - lapT0; if (tau > ref.lap) return null;
  let b = 0; while (b < ref.t.length - 1 && ref.t[b + 1] < tau) b++;
  const t0 = ref.t[b], t1 = b + 1 < ref.t.length ? ref.t[b + 1] : ref.lap, s = (b + Math.max(0, Math.min(1, (tau - t0) / Math.max(1e-6, t1 - t0)))) * BIN;
  const i = R.idx(s), [x, y] = R.pt(i, TJ.racing_line.offset[i]); return { x, y, h: R.heading(i), s };
}
function draw() {
  const W = canvas.width, H = canvas.height;
  if (overview) { view.z = Math.min(W / 1500, H / 1300) * 0.95; view.x = -380; view.y = -330; }
  else { const la = Math.min(12, car.vx * 0.12); view.x = car.x + Math.cos(car.psi) * la; view.y = car.y + Math.sin(car.psi) * la; }
  R.drawCached(ctx, view, { structures: true, lines: false, straightMode: true, grid: false });
  R.worldTransform(ctx, view);
  if (skid.length) { ctx.fillStyle = "rgba(8,8,10,0.55)"; const r = 0.16; for (let i = 0; i < skid.length; i += 2) ctx.fillRect(skid[i] - r, skid[i + 1] - r, 2 * r, 2 * r); }
  if ($<HTMLInputElement>("lyrPlan").checked) { ctx.lineWidth = Math.max(0.35, 1.6 / view.z); ctx.globalAlpha = 0.85; for (const q of planPaths) { ctx.strokeStyle = q.col; ctx.stroke(q.p); } ctx.globalAlpha = 1; }
  const tm = CARS.teams[team], drv = CARS.drivers.find(d => d.code === ghostCode) ?? CARS.drivers.find(d => d.team === team)!;
  const ppm = view.z, shape = shapeOf(team);
  const gp = $<HTMLInputElement>("lyrGhost").checked ? ghostPose() : null;
  if (gp) {
    const gd = CARS.drivers.find(d => d.code === ghostCode)!, gt = CARS.teams[gd.team];
    ctx.save(); ctx.translate(gp.x, gp.y); ctx.rotate(gp.h);
    ctx.fillStyle = "rgba(226,232,240,0.28)"; ctx.strokeStyle = "rgba(226,232,240,0.85)"; ctx.lineWidth = Math.max(0.06, 1.2 / view.z);   // light halo: a "ghost"
    ctx.beginPath(); ctx.roundRect(-2.9, -1.15, 5.8, 2.3, 1.1); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.55; ctx.scale(1, -1);
    drawCarCached(ctx, shapeOf(gd.team), { team: gd.team, livery: gt.livery, helmet: gd.helmet, tcam: gd.tcam, number: gd.num, tyreColor: "#ef4444" }, ppm); ctx.restore();
    if (view.z > 2) { const [sx, sy] = R.toScreen(ctx, view, gp.x, gp.y); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = "bold 11px system-ui"; ctx.fillStyle = "#e2e8f0"; ctx.fillText(`${ghostCode} (thật)`, sx + 14, sy - 12); ctx.restore(); }
  }
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.psi); ctx.scale(1, -1);
  const me = CARS.drivers.find(d => d.team === team && d.code === bestOf(team)[0]) ?? drv;
  drawCarCached(ctx, shape, { team, livery: tm.livery, helmet: me.helmet, tcam: me.tcam, number: me.num, tyreColor: "#ef4444", aeroMode: car.modeX ? "X" : "Z", selected: true }, ppm);
  ctx.restore();
  if ($<HTMLInputElement>("lyrForces").checked && !overview) {
    const cs = Math.cos(car.psi), sn = Math.sin(car.psi), sc = 1 / 2500;          // 1 m per 2.5 kN
    ctx.lineWidth = Math.max(0.08, 1.5 / view.z);
    car.w.forEach((w, k) => {
      const x = k < 2 ? P.a : -P.b, y = (k % 2 ? -1 : 1) * (k < 2 ? P.tf : P.tr) / 2, d = k < 2 ? car.delta : 0;
      const wx = car.x + x * cs - y * sn, wy = car.y + x * sn + y * cs, fx = w.fx * Math.cos(d) - w.fy * Math.sin(d), fy = w.fx * Math.sin(d) + w.fy * Math.cos(d);
      const gx = fx * cs - fy * sn, gy = fx * sn + fy * cs;
      ctx.strokeStyle = w.slide ? "#ef4444" : "#fde047"; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + gx * sc, wy + gy * sc); ctx.stroke();
    });
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (car.crashed) { ctx.fillStyle = "rgba(239,68,68,0.9)"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center"; ctx.fillText("Va chạm rào chắn · chạy lại", W / 2, H / 2 - 40); ctx.textAlign = "left"; }
}

function hud() {
  const v = car.vx * 3.6, c = lastC;
  $("spd").textContent = Math.max(0, v).toFixed(0); $("gear").textContent = String(car.gear); $("rpm").textContent = `${car.rpm.toFixed(0)} rpm`;
  $("rpmBar").style.width = `${Math.min(100, (car.rpm - 4000) / (P.pt.rpmMax - 4000) * 100)}%`;
  $("thrT").textContent = `${(c.throttle * 100).toFixed(0)}%`; $("thrBar").style.width = `${c.throttle * 100}%`;
  $("brkT").textContent = `${(c.brake * 100).toFixed(0)}%`; $("brkBar").style.width = `${c.brake * 100}%`;
  $("socT").textContent = `${(car.soc / 1e6).toFixed(2)} MJ`; $("socBar").style.width = `${car.soc / P.pt.esJ * 100}%`;
  $("harvT").textContent = `${(car.harvestedLap / 1e6).toFixed(2)} / ${(P.pt.harvestLapJ / 1e6).toFixed(1)} MJ`; $("harvBar").style.width = `${car.harvestedLap / P.pt.harvestLapJ * 100}%`;
  const kW = car.pK / 1e3; $("kT").textContent = `${kW > 0 ? "+" : ""}${kW.toFixed(0)} kW ${kW > 1 ? "xả" : kW < -1 ? "sạc" : ""}`;
  $("kT").style.color = kW > 1 ? "#facc15" : kW < -1 ? "#38bdf8" : ""; $("iceT").textContent = `${(car.pIce / 1e3).toFixed(0)} kW`;
  $("modeT").textContent = car.modeX ? "X (Straight Mode, ít cản)" : "Z (bám đường)"; $("modeT").style.color = car.modeX ? "#38bdf8" : "";
  // delta to the real lap at the same distance
  const ref = TEL.drivers[ghostCode], b = Math.floor(car.s / BIN);
  if (lapT0 >= 0 && b < ref.t.length && b < cur.t.length) {
    const d = (simT - lapT0) - ref.t[b]; $("delta").textContent = `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)} s`;
    $("delta").style.color = d <= 0 ? "#22c55e" : "#f59e0b";
  } else $("delta").textContent = "—";
  // tyres
  car.w.forEach((w, k) => {
    const u = Math.min(1.1, w.use), col = w.slide ? "#ef4444" : u < 0.6 ? "#22c55e" : u < 0.9 ? `hsl(${120 - (u - 0.6) / 0.3 * 70},80%,50%)` : "#f97316";
    const el = $(`ty${k}`); el.style.background = col; el.textContent = (w.fz / 1000).toFixed(1);
  });
  // g-g diagram
  const S = gg.width, cx = S / 2, cy = S / 2, k = S / 2 / 6;                       // 6 g to the edge
  trail.push([car.ay / 9.81, car.ax / 9.81]); if (trail.length > 90) trail.shift();
  gctx.clearRect(0, 0, S, S); gctx.strokeStyle = "#263042"; gctx.lineWidth = 1;
  for (let r = 1; r <= 5; r++) { gctx.beginPath(); gctx.arc(cx, cy, r * k, 0, 7); gctx.stroke(); }
  gctx.beginPath(); gctx.moveTo(0, cy); gctx.lineTo(S, cy); gctx.moveTo(cx, 0); gctx.lineTo(cx, S); gctx.stroke();
  gctx.fillStyle = "#4b5563"; gctx.font = "9px system-ui"; gctx.fillText("5g", cx + 5 * k - 12, cy - 2); gctx.fillText("phanh", cx + 2, S - 3); gctx.fillText("tăng tốc", cx + 2, 9);
  gctx.strokeStyle = "rgba(0,215,182,0.5)"; gctx.beginPath();
  trail.forEach(([a, l], i) => { const x = cx - a * k, y = cy - l * k; i ? gctx.lineTo(x, y) : gctx.moveTo(x, y); }); gctx.stroke();
  gctx.fillStyle = "#00d7b6"; gctx.beginPath(); gctx.arc(cx - car.ay / 9.81 * k, cy - car.ax / 9.81 * k, 3.5, 0, 7); gctx.fill();
}

function fmt(t: number) { const m = Math.floor(t / 60), s = t - 60 * m; return `${m}:${s.toFixed(3).padStart(6, "0")}`; }
function updateTimes() {
  const ref = TEL.drivers[ghostCode], row = (name: string, t: number | null, s: (number | undefined)[], cls = "") =>
    `<tr class="${cls}"><td>${name}</td><td>${t ? fmt(t) : "—"}</td>${[0, 1, 2].map(i => `<td>${s[i] ? s[i]!.toFixed(3) : "—"}</td>`).join("")}</tr>`;
  const live = lapT0 >= 0 ? [sectors[0], sectors[1] !== undefined ? sectors[1] - sectors[0] : undefined] : [];
  const cmp = (x: { time: number } | null) => (x ? (x.time < ref.lap ? "faster" : "slower") : "");
  $("times").innerHTML = `<table><tr><th></th><th>Vòng</th><th>S1</th><th>S2</th><th>S3</th></tr>` +
    row(`Thật · ${ghostCode}`, ref.lap, [ref.s1, ref.s2, ref.s3]) +
    row("Giới hạn lý thuyết (QSS)", prof.lapTime, []) +
    row("Mô phỏng · tốt nhất", best?.time ?? null, best?.sectors ?? [], cmp(best)) +
    row("Mô phỏng · vừa xong", last?.time ?? null, last?.sectors ?? [], cmp(last)) +
    row("Vòng hiện tại", null, live) + `</table>`;
}

function drawChart() {
  const W = chart.clientWidth, H = chart.clientHeight, dpr = devicePixelRatio || 1;
  if (chart.width !== Math.round(W * dpr)) { chart.width = Math.round(W * dpr); chart.height = Math.round(H * dpr); }
  const g = cctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const left = 34, right = 6, top = 4, strip = 22, bottom = 14 + strip, ph = H - top - bottom, pw = W - left - right;
  const X = (s: number) => left + s / trk.L * pw, Y = (v: number) => top + ph - (v - 50) / 300 * ph;
  g.font = "10px system-ui"; g.fillStyle = "#64748b"; g.strokeStyle = "#1f2937"; g.lineWidth = 1;
  for (const v of [100, 150, 200, 250, 300, 350]) { g.beginPath(); g.moveTo(left, Y(v)); g.lineTo(W - right, Y(v)); g.stroke(); g.fillText(String(v), 4, Y(v) + 3); }
  for (const id of ["sector1", "sector2"]) { const x = X(trk.sAt(id)); g.strokeStyle = "#475569"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, top + ph); g.stroke(); g.setLineDash([]); }
  g.fillStyle = "#94a3b8"; g.textAlign = "center";
  for (const c of TJ.corners) g.fillText(`T${c.n}`, X(c.apex_s), top + ph + 11);
  g.textAlign = "left";
  const line = (arr: number[], col: string, w: number) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); arr.forEach((v, i) => (i ? g.lineTo(X(i * BIN), Y(v)) : g.moveTo(X(0), Y(v)))); g.stroke(); };
  const ref = TEL.drivers[ghostCode];
  line(ref.v, "#64748b", 1.5);
  if (prevLap) line(prevLap.v, "#334155", 1.5);
  line(cur.v, ($("lgSim").style.background as string) || "#00d7b6", 2);
  // throttle/brake strips: real on top, sim below
  const sy = top + ph + 14, hh = strip / 2 - 1;
  const strips = (thr: number[], brk: number[], y: number) => { for (let i = 0; i < thr.length; i++) {
    g.fillStyle = brk[i] > 10 ? `rgba(239,68,68,${0.3 + brk[i] / 150})` : `rgba(34,197,94,${thr[i] / 110})`; g.fillRect(X(i * BIN), y, Math.max(1, pw / nBins + 0.5), hh); } };
  strips(ref.thr, ref.brk, sy); strips(cur.thr, cur.brk, sy + hh + 2);
  const cx = X(car.s); g.strokeStyle = "#e5e7eb"; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx, H); g.stroke();
}

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener("resize", resize);
canvas.addEventListener("wheel", e => { e.preventDefault(); if (!overview) view.z = Math.min(30, Math.max(0.6, view.z * Math.exp(-e.deltaY * 0.0015))); }, { passive: false });
$<HTMLSelectElement>("team").addEventListener("change", e => setTeam((e.target as HTMLSelectElement).value));
$<HTMLSelectElement>("ghostSel").addEventListener("change", e => { ghostCode = (e.target as HTMLSelectElement).value; $("lgReal").textContent = `vòng thật ${ghostCode}`; updateTimes(); });
for (const b of document.querySelectorAll<HTMLButtonElement>("button[data-k]")) b.addEventListener("click", () => {
  speedK = +b.dataset.k!; document.querySelectorAll("button[data-k]").forEach(x => x.classList.toggle("on", x === b)); });
$("pause").addEventListener("click", () => { paused = !paused; $("pause").textContent = paused ? "▶" : "❚❚"; });
$("restart").addEventListener("click", restart);
$("camBtn").addEventListener("click", () => { overview = !overview; $("camBtn").classList.toggle("on", overview); if (!overview) view.z = CAM_Z; });
const setMode = (m: "ai" | "key") => { mode = m; $("drvAI").classList.toggle("on", m === "ai"); $("drvKey").classList.toggle("on", m === "key"); $("keys").style.display = m === "key" ? "block" : "none";
  keyCtl.steer = car.delta / P.steer.max; (document.activeElement as HTMLElement)?.blur(); };
$("drvAI").addEventListener("click", () => setMode("ai")); $("drvKey").addEventListener("click", () => setMode("key"));
load();
