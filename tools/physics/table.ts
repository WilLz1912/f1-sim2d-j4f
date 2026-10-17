import { loadTrack, loadCars, loadTelemetry } from "./node-load";
import { flyingLap } from "../../src/sim/lap";
const trk = loadTrack(), C = loadCars(), team = process.argv[2] ?? "mercedes", code = process.argv[3] ?? "RUS", ref = loadTelemetry().drivers[code];
const r = flyingLap(trk, C.build(team));
let line = ""; for (let b = 0; b < r.v.length; b += 10) { line += `${String(b * 5).padStart(5)} ${r.v[b].toFixed(0).padStart(3)}/${ref.v[b].toFixed(0).padStart(3)}  `; if ((b / 10) % 8 === 7) { console.log(line); line = ""; } }
console.log(line); console.log(r.time.toFixed(3), ref.lap);
