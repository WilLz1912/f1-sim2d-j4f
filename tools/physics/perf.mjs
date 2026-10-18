// Frame-time profile of the physics lab in headless Chromium (no GPU). Needs `npm run dev` on :5173. Usage: node tools/physics/perf.mjs ["&speed=4"]
import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--enable-gpu-rasterization"] }); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto("http://localhost:5173/physics.html?perf" + (process.argv[2] ?? "")); await p.waitForTimeout(4000);
await p.evaluate(() => { for (const k in window.__perf) window.__perf[k].length = 0; });
await p.waitForTimeout(15000);
const r = await p.evaluate(() => Object.fromEntries(Object.entries(window.__perf).map(([k, a]) => { const s = [...a].sort((x, y) => x - y); return [k, { n: a.length, mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1) }]; })));
console.log(JSON.stringify(r)); await b.close();
