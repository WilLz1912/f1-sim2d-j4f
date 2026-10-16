// Car showcase: every 2026 car drawn large with its specs, sources, drivers, helmets and T-cam colours.
import { drawCar, type CarShape, type Livery, type Helmet } from "../render/car";

interface Spec { v: number; src: string }
interface Team { car: string; entrant: string; code3: string; pu: string; gearbox: string; mass_kg: Spec; wheelbase_mm: Spec; length_mm: Spec; width_mm: Spec;
  suspension: { front: string; rear: string }; livery: Livery & { desc?: string }; physics: { track_front_mm: number; track_rear_mm: number };
  barcelona_2026_q: { best_driver: string; lap: number; st: number; min_T9: number } }
interface Cars { teams: Record<string, Team>; drivers: { code: string; name: string; num: number; team: string; helmet: Helmet; tcam: "black" | "yellow" }[];
  regs: { tyre_front: { width_mm: number; diameter_mm: number }; tyre_rear: { width_mm: number; diameter_mm: number } } }

async function main() {
const C: Cars = await (await fetch("/data/cars/cars_2026.json")).json();
const order = Object.entries(C.teams).sort((a, b) => a[1].barcelona_2026_q.lap - b[1].barcelona_2026_q.lap);
const pole = order[0][1].barcelona_2026_q.lap;
const grid = document.getElementById("grid")!;
const est = (s: Spec, unit: string) => `<span class="${/estimate/.test(s.src) ? "est" : ""}" title="${s.src}">${s.v} ${unit}</span>`;
for (const [key, t] of order) {
  const drivers = C.drivers.filter(d => d.team === key);
  const el = document.createElement("div"); el.className = "team";
  el.innerHTML = `<h2>${t.car} <span class="sub">· ${t.entrant}</span></h2>
    <div class="sub">${t.livery.desc ?? ""}</div><div class="row"></div>
    <table>
      <tr><td>Khối lượng</td><td>${est(t.mass_kg, "kg")}</td><td>Trục cơ sở</td><td>${est(t.wheelbase_mm, "mm")}</td></tr>
      <tr><td>Dài</td><td>${est(t.length_mm, "mm")}</td><td>Rộng</td><td>${t.width_mm.v} mm</td></tr>
      <tr><td>Động cơ</td><td>${t.pu}</td><td>Hộp số</td><td>${t.gearbox}</td></tr>
      <tr><td>Treo trước/sau</td><td colspan="3">${t.suspension.front} / ${t.suspension.rear}</td></tr>
      <tr><td>Q Barcelona 2026</td><td colspan="3">${t.barcelona_2026_q.lap.toFixed(3)} s (+${(t.barcelona_2026_q.lap - pole).toFixed(3)}) · trap ${t.barcelona_2026_q.st} km/h · T9 min ${t.barcelona_2026_q.min_T9} km/h</td></tr>
      ${drivers.map(d => `<tr><td>#${d.num} ${d.code}</td><td colspan="3">${d.name} · T-cam <span class="tc" style="background:${d.tcam === "yellow" ? "#E6FF00" : "#050506"}"></span> ${d.tcam === "yellow" ? "vàng" : "đen"} · mũ <span class="tc" style="background:${d.helmet.base}"></span><span class="tc" style="background:${d.helmet.second}"></span><span class="tc" style="background:${d.helmet.accent}"></span></td></tr>`).join("")}
    </table>`;
  const row = el.querySelector(".row")!;
  for (const d of drivers) {
    const cv = document.createElement("canvas"); cv.width = 250; cv.height = 110; row.appendChild(cv);
    const g = cv.getContext("2d")!, k = 40;   // 40 px per metre
    const shape: CarShape = { length: t.length_mm.v / 1000, width: t.width_mm.v / 1000, wheelbase: t.wheelbase_mm.v / 1000,
      tyreF: { w: C.regs.tyre_front.width_mm / 1000, d: C.regs.tyre_front.diameter_mm / 1000 },
      tyreR: { w: C.regs.tyre_rear.width_mm / 1000, d: C.regs.tyre_rear.diameter_mm / 1000 },
      trackF: t.physics.track_front_mm / 1000, trackR: t.physics.track_rear_mm / 1000 };
    g.translate(cv.width / 2, cv.height / 2); g.scale(k, k);
    drawCar(g, shape, { livery: t.livery, helmet: d.helmet, tcam: d.tcam, number: d.num, tyreColor: "#ef4444" });
  }
  grid.appendChild(el);
}
}
main();
