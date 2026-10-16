// Sinh / kiểm golden của V11 bằng các harness chính, chạy song song.
//   node tools/golden.mjs            -> ghi vào golden/v11/
//   node tools/golden.mjs --check    -> chạy lại vào thư mục tạm và so với golden/v11/
//   node tools/golden.mjs --only race_s33,quali_s3   -> chỉ chạy một số job
import { spawn, execSync } from "node:child_process";
import { cpus, tmpdir } from "node:os";
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const H = join(ROOT, "tools/harness");
const HTML = process.env.SIM_HTML || join(ROOT, "v11/opus_argon_f1_2026_simulator_v11.html");
const GOLD = join(ROOT, "golden/v11");
const check = process.argv.includes("--check");
const onlyArg = process.argv[process.argv.indexOf("--only") + 1];
const only = process.argv.includes("--only") ? new Set(onlyArg.split(",")) : null;
// Golden is pinned to Node 22: V8 in Node 24 evaluates some Math functions differently in the last
// bits, and the race is chaotic, so the same seed gives a different race (Node 18/20/22 agree).
const GOLDEN_NODE_MAJOR = 22;
const NODE = +process.versions.node.split(".")[0] === GOLDEN_NODE_MAJOR ? process.execPath
  : execSync(`npx -y -p node@${GOLDEN_NODE_MAJOR} node -p process.execPath`, { encoding: "utf8" }).trim();
const OUT = check ? mkdtempSync(join(tmpdir(), "golden-")) : GOLD;
mkdirSync(OUT, { recursive: true });

// name, script, args (OUT_DIR is replaced by the output directory)
const JOBS = [
  ["race_s32", "race2.js", ["barcelona", "32", "OUT_DIR/race_s32.json"]],
  ["race_s33", "race2.js", ["barcelona", "33", "OUT_DIR/race_s33.json"]],
  ["race_s34", "race2.js", ["barcelona", "34", "OUT_DIR/race_s34.json"]],
  ["battles_s33", "battles.js", ["barcelona", "33", "66"]],
  ["quali_s3", "qdbg.js", ["barcelona", "3"]],
  ["qcal5", "qcal5.js", ["barcelona"]],
  ["pitloss", "pitloss.js", ["barcelona"]],
].filter(j => !only || only.has(j[0]));

// Lines that legitimately differ between runs (wall-clock time).
const normalize = s => s.replace(/\r/g, "").replace(/wall=\d+(\.\d+)?s/g, "wall=?").replace(/\b\d+(\.\d+)? ?ms\b/g, "?ms");

function run([name, script, args]) {
  return new Promise(res => {
    const t0 = Date.now();
    const a = [join(H, script), HTML, ...args.map(x => x.replace("OUT_DIR", OUT))];
    const p = spawn(NODE, a, { cwd: H });
    let out = "";
    p.stdout.on("data", d => (out += d));
    p.stderr.on("data", d => (out += d));
    p.on("close", code => {
      writeFileSync(join(OUT, name + ".out"), out);
      console.log(`${code === 0 ? "ok  " : "FAIL"} ${name} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      res(code);
    });
  });
}

const limit = Math.max(1, Math.min(JOBS.length, cpus().length - 2));
console.log(`${JOBS.length} jobs, ${limit} parallel -> ${OUT}`);
const queue = [...JOBS];
let fails = 0;
await Promise.all(Array.from({ length: limit }, async () => {
  while (queue.length) if ((await run(queue.shift())) !== 0) fails++;
}));

if (check) {
  let diff = 0;
  for (const [name] of JOBS) {
    const g = join(GOLD, name + ".out");
    if (!existsSync(g)) { console.log(`MISSING golden ${name}`); diff++; continue; }
    const same = normalize(readFileSync(g, "utf8")) === normalize(readFileSync(join(OUT, name + ".out"), "utf8"));
    if (!same) { console.log(`DIFF ${name}: ${g} vs ${join(OUT, name + ".out")}`); diff++; }
  }
  console.log(diff ? `${diff} job(s) differ` : "golden khớp 100%");
  process.exit(diff || fails ? 1 : 0);
}
process.exit(fails ? 1 : 0);
