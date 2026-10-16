// Battle recorder: every attack attempt with its outcome and the reason it ended,
// plus "real" passes (both cars healthy, side-by-side phase, not pit/lapping/limping).
const fs = require("fs"), vm = require("vm");
const path = process.argv[2], track = process.argv[3] || "barcelona", seed = +process.argv[4] || 1, laps = +process.argv[5] || 30;
let code = fs.readFileSync(path, "utf8").match(/<script>([\s\S]*)<\/script>/)[1];
const hook = (a, b) => { if (!code.includes(a)) { console.error("HOOK NOT FOUND:", a.slice(0, 60)); process.exit(1); } code = code.replace(a, b); };
hook("        c.attacking = true;\n        c.attackOn = frontOnTrack.idx;", "        c.attacking = true;\n        c.attackOn = frontOnTrack.idx;\n        __B.start(c, frontOnTrack, frontGap);");
hook("{ c.attacking = false; state.stats.abort++; }", "{ __B.end(c, 'abort-not-alongside-before-braking'); c.attacking = false; state.stats.abort++; }");
hook("      if (c.attacking) state.stats.yieldCorner++;", "      if (c.attacking) { state.stats.yieldCorner++; __B.end(c, 'yield-no-corner-rights'); }");
hook("    if (!frontOnTrack || frontOnTrack.finished || frontGap > 70 || (c.attackOn !== undefined && c.attackOn !== frontOnTrack.idx)) {\n      c.attacking = false;",
     "    if (!frontOnTrack || frontOnTrack.finished || frontGap > 70 || (c.attackOn !== undefined && c.attackOn !== frontOnTrack.idx)) {\n      if (c.attacking) __B.end(c, frontOnTrack && frontOnTrack.idx !== c.attackOn ? 'target-changed' : 'dropped-back');\n      c.attacking = false;");

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const M = Object.create(Math); M.random = mulberry32(seed);
const fe = () => ({ textContent: "", innerHTML: "", value: "", className: "", dataset: {}, style: {}, children: [0, 1, 2, 3, 4, 5, 6].map(() => ({ style: {}, dataset: {} })), classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, appendChild() {}, prepend() {}, removeChild() {}, getContext() { return new Proxy({}, { get: () => () => ({ addColorStop() {} }), set: () => true }); } });
const els = {};
const ctx = { Math: M, console, document: { getElementById: i => els[i] || (els[i] = fe()), createElement: fe, querySelectorAll: () => [] }, window: { innerWidth: 1600, innerHeight: 900, addEventListener() {} }, performance: { now: () => 0 }, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, Set, Float64Array };
vm.createContext(ctx);
ctx.__B = {
  open: {}, done: [],
  start(c, o, gap) {
    if (this.open[c.idx]) return;
    this.open[c.idx] = { a: c.code, d: o.code, t0: G().state.raceTime, lap: c.lap, s0: c.s, gap0: gap, v0: c.speedMps, vo0: o.speedMps,
      minGap: gap, alongside: false, lateBrake: false, reason: null, aIdx: c.idx, dIdx: o.idx, defending0: o.defending };
  },
  end(c, reason) { const e = this.open[c.idx]; if (e && !e.reason) { e.reason = reason; e.tEnd = G().state.raceTime; e.sEnd = c.s; } }
};
vm.runInContext(code + '\n;globalThis.__get = () => ({ state, cars, physCarLenU, unitToMeter, CIRCUITS, TYRE_SPECS, CAR_WIDTH, HALF_TRACK });', ctx);
const G = () => ctx.__get();
vm.runInContext(`logMsg=()=>{};showToast=()=>{};activeTrackKey="${track}";CIRCUITS["${track}"].totalLaps=${laps};initRace();`, ctx);

const healthy = c => !c.dnf && !c.inPit && !c.puncture && !c.failed && !(c.limpMax > 0) && c.wear < G().TYRE_SPECS[c.compound].cliff && Math.abs(c.dLat) < G().HALF_TRACK + 1.0 && !c.blueFlag;
const pairState = {}; const realPasses = []; let fakePasses = 0;
let followTime = 0, followHealthyTime = 0;
const dt = 1 / 60;
for (let i = 0; i < 60 * 9000; i++) {
  ctx.stepPhysics(dt);
  const g = G(); const st = g.state;
  if (st.raceOver) break;
  const L = g.CIRCUITS[track].lengthMeters;
  const carLen = g.physCarLenU * g.unitToMeter;
  // update open attack episodes
  for (const [k, e] of Object.entries(ctx.__B.open)) {
    const a = g.cars[e.aIdx], d = g.cars[e.dIdx];
    const gap = d.totalDistM - a.totalDistM;
    e.minGap = Math.min(e.minGap, gap);
    const lat = Math.abs(a.dLat - d.dLat);
    if (Math.abs(gap) < carLen * 0.9 && lat > g.CAR_WIDTH * 1.1) e.alongside = true;
    if (a.lateBrake > 0) e.lateBrake = true;
    const age = st.raceTime - e.t0;
    if (gap < -carLen * 0.6) { e.result = "PASSED"; }
    if ((e.reason && st.raceTime - e.tEnd > 3) || age > 25 || a.dnf || d.dnf) {
      if (!e.result) e.result = gap < 0 ? "PASSED" : "no pass";
      e.age = age;
      ctx.__B.done.push(e); delete ctx.__B.open[k];
    }
  }
  // real passes between healthy cars on the same lap, with a side-by-side phase
  if (i % 6 === 0 && st.raceControl === "GREEN" && st.leaderLap > 1) {
    const run = g.cars.filter(c => !c.dnf && !c.finished);
    for (const A of run) for (const B of run) {
      if (A.idx >= B.idx) continue;
      const key = A.idx + "-" + B.idx;
      const d = A.totalDistM - B.totalDistM;
      if (Math.abs(d) > 60) { delete pairState[key]; continue; }
      const ps = pairState[key] || (pairState[key] = { sign: Math.sign(d), sbs: false, healthy: true, t: st.raceTime });
      if (Math.abs(d) < carLen * 0.9 && Math.abs(A.dLat - B.dLat) > g.CAR_WIDTH * 1.1) ps.sbs = true;
      if (!healthy(A) || !healthy(B)) ps.healthy = false;
      const sg = Math.sign(d);
      if (sg !== ps.sign && Math.abs(d) > carLen * 0.8) {
        if (ps.healthy && ps.sbs) realPasses.push({ lap: st.leaderLap, winner: sg > 0 ? A.code : B.code, loser: sg > 0 ? B.code : A.code, s: (sg > 0 ? A : B).s.toFixed(3) });
        else fakePasses++;
        pairState[key] = { sign: sg, sbs: false, healthy: true, t: st.raceTime };
      }
    }
    // following statistics: cars within 1 s of a healthy car ahead
    for (const c of run) {
      const ahead = run.filter(o => o !== c && o.totalDistM > c.totalDistM && o.totalDistM - c.totalDistM < Math.max(20, c.speedMps * 1.0));
      if (ahead.length) { followTime += 0.1; if (healthy(c) && ahead.some(healthy)) followHealthyTime += 0.1; }
    }
  }
}
const D = ctx.__B.done;
const by = f => D.reduce((m, e) => (m[f(e)] = (m[f(e)] || 0) + 1, m), {});
console.log(`${track} seed=${seed} laps=${laps}: attack attempts=${D.length}  REAL passes (healthy, side-by-side)=${realPasses.length}  other order swaps=${fakePasses}`);
console.log(`  healthy car-seconds spent within 1s of a healthy car ahead: ${followHealthyTime.toFixed(0)} s`);
console.log("  attempt results:", JSON.stringify(by(e => e.result)));
console.log("  end reasons:", JSON.stringify(by(e => e.reason || "none")));
console.log("  reached alongside:", D.filter(e => e.alongside).length, " used late-braking:", D.filter(e => e.lateBrake).length, " defender was defending at start:", D.filter(e => e.defending0).length);
const gaps = D.map(e => e.gap0).sort((a, b) => a - b), mins = D.map(e => e.minGap).sort((a, b) => a - b);
const q = (arr, p) => arr.length ? arr[Math.floor(p * (arr.length - 1))].toFixed(1) : "-";
console.log(`  gap at attack start (m) p10/p50/p90: ${q(gaps, .1)}/${q(gaps, .5)}/${q(gaps, .9)}   closest approach p10/p50/p90: ${q(mins, .1)}/${q(mins, .5)}/${q(mins, .9)}   car length ${(G().physCarLenU * G().unitToMeter).toFixed(1)} m`);
const dv = D.map(e => (e.v0 - e.vo0)).sort((a, b) => a - b);
console.log(`  closing speed at start (m/s) p10/p50/p90: ${q(dv, .1)}/${q(dv, .5)}/${q(dv, .9)}`);
console.log("  real passes:", realPasses.slice(0, 20).map(p => `L${p.lap} ${p.winner}>${p.loser}@${p.s}`).join("  "));
fs.writeFileSync(`battles_${track}_${seed}.json`, JSON.stringify({ D, realPasses }));
// yo-yo: the loser of a real pass re-passes the same car within 2 laps
let yoyo=0; for(let i=0;i<realPasses.length;i++){const p=realPasses[i]; if(realPasses.slice(i+1).some(q=>q.winner===p.loser&&q.loser===p.winner&&q.lap-p.lap<=2)) yoyo++;}
const perLap={}; realPasses.forEach(p=>perLap[p.lap]=(perLap[p.lap]||0)+1);
console.log("  line picks:", JSON.stringify(G().state.stats.linePick||{}));
console.log(`  yo-yo re-passes within 2 laps: ${yoyo}   laps with >=1 real pass: ${Object.keys(perLap).length}/${laps}`);
