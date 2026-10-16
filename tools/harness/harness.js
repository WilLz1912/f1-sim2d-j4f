// Headless harness: runs the V8 simulation without a browser and records events.
const fs = require("fs");
const vm = require("vm");

const scriptPath = process.argv[2];
const track = process.argv[3] || "barcelona";
const seed = parseInt(process.argv[4] || "1", 10);
let code = fs.readFileSync(scriptPath, "utf8");
if (scriptPath.endsWith(".html")) code = code.match(/<script>([\s\S]*)<\/script>/)[1];

// Deterministic RNG (mulberry32) so runs are reproducible
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(seed);
const MathR = Object.create(Math); MathR.random = rng;

function fakeEl() {
  const el = {
    textContent: "", innerHTML: "", value: "", className: "", dataset: {}, style: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, appendChild(c) { this.children.push(c); return c; }, prepend(c) { this.children.unshift(c); },
    removeChild() { this.children.pop(); }, get lastChild() { return this.children[this.children.length - 1]; },
    getContext() { return new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }); },
    width: 0, height: 0
  };
  return el;
}
const els = {};
const documentStub = {
  getElementById(id) { if (!els[id]) els[id] = fakeEl(); return els[id]; },
  createElement() { const e = fakeEl(); e.children = [0,1,2,3,4,5,6].map(() => fakeEl()); return e; },
  querySelectorAll() { return []; }
};
const ctx = {
  Math: MathR, console, document: documentStub, window: { innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1, addEventListener() {} },
  performance: { now: () => 0 }, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, Set, Float64Array, Object, Array, Infinity, isNaN, parseInt, parseFloat, Number, String
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

// Instrumentation
vm.runInContext(`
  var __ev = { logs: [], toasts: [], collisions: [] };
  var __origCol = handleOnTrackCollision;
  handleOnTrackCollision = function(att, def, rel, cfg) {
    // classify: heading diff, normal (lateral) closing speed, physical order, lapped
    let dAng = att.worldAngle - def.worldAngle; while (dAng > Math.PI) dAng -= 2*Math.PI; while (dAng < -Math.PI) dAng += 2*Math.PI;
    const dx = att.worldX - def.worldX, dy = att.worldY - def.worldY;
    const ca = Math.cos(def.worldAngle), sa = Math.sin(def.worldAngle);
    const localLong = dx*ca + dy*sa; // >0 => attacker physically ahead of defender
    const nlat = [-sa, ca];
    const vRel = [(att.vx-def.vx)*unitToMeter, (att.vy-def.vy)*unitToMeter];
    const vNormal = Math.abs(vRel[0]*nlat[0] + vRel[1]*nlat[1]);
    __ev.collisions.push({ t: state.raceTime, lap: state.leaderLap, rc: state.raceControl, rel: +rel.toFixed(1), vNormal: +vNormal.toFixed(1),
      dAngDeg: +(dAng*180/Math.PI).toFixed(1), attAheadPhysically: localLong > 0, lapGap: Math.round((def.totalDistM - att.totalDistM)/CIRCUITS[activeTrackKey].lengthMeters),
      att: att.code, def: def.code, attSpeed: +(att.speedMps*3.6).toFixed(0), scPhase: state.scCar.phase });
    return __origCol(att, def, rel, cfg);
  };
  logMsg = function(t) { __ev.logs.push({ t: state.raceTime, txt: t }); };
  showToast = function(t) { __ev.toasts.push({ t: state.raceTime, txt: t }); };
`, ctx);

vm.runInContext(`activeTrackKey = "${track}"; initRace();`, ctx);

// Probe: leader lap shortly after start
const dt = 1 / 180;
let simT = 0, probes = {};
const maxT = 12000;
while (simT < maxT) {
  vm.runInContext(`stepPhysics(${dt})`, ctx);
  simT += dt;
  if (!probes.start && vm.runInContext(`state.raceControl === "GREEN" && state.raceTime > 3`, ctx)) {
    probes.start = vm.runInContext(`({ leaderLap: state.leaderLap, momEnabled: state.momEnabled, leaderDist: [...cars].sort((a,b)=>b.totalDistM-a.totalDistM)[0].totalDistM.toFixed(0) })`, ctx);
  }
  if (vm.runInContext(`state.raceControl === "CHECKERED"`, ctx)) break;
}

const summary = vm.runInContext(`(() => {
  const L = CIRCUITS[activeTrackKey].lengthMeters;
  const carInfo = cars.map(c => ({ code: c.code, lap: c.lap, lapFromDist: Math.floor(Math.max(0,c.totalDistM) / L) + 1, stops: c.pitStops, pen: c.penaltySec, dnf: c.dnf }));
  return { raceTime: state.raceTime.toFixed(0), rc: state.raceControl, leaderLap: state.leaderLap, carInfo, ev: __ev };
})()`, ctx);
summary.probes = probes;
fs.writeFileSync(process.argv[5] || "out.json", JSON.stringify(summary, null, 1));

// Console report
const logs = summary.ev.logs.map(l => l.txt);
const cnt = (re) => logs.filter(t => re.test(t)).length;
console.log(`track=${track} seed=${seed} raceTime=${summary.raceTime}s final=${summary.rc} leaderLap=${summary.leaderLap}`);
console.log("probe after start:", JSON.stringify(probes.start));
console.log("SC deploys:", cnt(/Safety Car exits Pit Lane/), " VSC:", cnt(/VSC deployed/), " RedFlag:", cnt(/slowing field to assess/));
console.log("Pens: speeding", cnt(/speeding in Pit Lane/), " unsafe", cnt(/Unsafe Pit Release/), " trackLimit+10", cnt(/not giving position back/), " stewards", cnt(/STEWARDS: \+\d+s penalty to \w+ \(/) - cnt(/speeding|Unsafe/));
console.log("giveBack log spam:", cnt(/hands position back/), " beached:", cnt(/beached/), " kerb floor dmg:", cnt(/high kerb/));
const cols = summary.ev.collisions;
console.log("collisions:", cols.length, " byRC:", JSON.stringify(cols.reduce((m, c) => (m[c.rc] = (m[c.rc] || 0) + 1, m), {})));
console.log("  rel>=14.5:", cols.filter(c => c.rel >= 14.5).length, " of which vNormal<5:", cols.filter(c => c.rel >= 14.5 && c.vNormal < 5).length);
console.log("  attacker physically AHEAD (wrong blame):", cols.filter(c => c.attAheadPhysically).length, " lapped pairs:", cols.filter(c => c.lapGap !== 0).length);
const penLaps = summary.ev.logs.filter(l => /penalty|penalized|Penalty/.test(l.txt) && !/Served/.test(l.txt)).map(l => (l.txt.match(/^L(\d+)/)||[])[1]);
console.log("penalty laps:", penLaps.join(","));
console.log("SC laps:", summary.ev.logs.filter(l => /Safety Car exits/.test(l.txt)).map(l => (l.txt.match(/^L(\d+)/)||[])[1] + "(" + l.txt.split("(")[1].split(")")[0] + ")").join(" | "));
console.log("VSC laps:", summary.ev.logs.filter(l => /VSC deployed/.test(l.txt)).map(l => (l.txt.match(/^L(\d+)/)||[])[1]).join(","));
console.log("stops per car:", summary.carInfo.filter(c=>!c.dnf).map(c=>c.stops).join(""), " DNF:", summary.carInfo.filter(c=>c.dnf).map(c=>c.code).join(","));
const lapMismatch = summary.carInfo.filter(c => !c.dnf && c.lap !== c.lapFromDist);
console.log("lap counter vs distance mismatch:", lapMismatch.map(c => `${c.code}:lap${c.lap}/dist${c.lapFromDist}/stops${c.stops}`).join(" "));
