"""Kéo dữ liệu thật phân hạng GP Barcelona 2026 (session 11303) từ OpenF1 (api.openf1.org).
Lưu vào data/openf1/: danh sách lap, vòng nhanh nhất của từng tay đua (telemetry + vị trí x,y)."""
import json, os, sys, time, urllib.request, datetime as dt
SESSION = int(sys.argv[1]) if len(sys.argv) > 1 else 11303
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "data", "openf1"); os.makedirs(OUT, exist_ok=True)
def get(path):
    for k in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request("https://api.openf1.org/v1/" + path, headers={"User-Agent": "f1-sim"}), timeout=120) as r:
                return json.load(r)
        except Exception as e:
            print("retry", path, e); time.sleep(3 + 3 * k)
    raise SystemExit("failed " + path)
def save(name, obj): json.dump(obj, open(os.path.join(OUT, name), "w"))
drivers = get(f"drivers?session_key={SESSION}"); save(f"s{SESSION}_drivers.json", drivers)
laps = get(f"laps?session_key={SESSION}"); save(f"s{SESSION}_laps.json", laps)
best = {}
for l in laps:
    if l.get("lap_duration") and not l.get("is_pit_out_lap"):
        b = best.get(l["driver_number"])
        if not b or l["lap_duration"] < b["lap_duration"]: best[l["driver_number"]] = l
fast = {}
for num, l in sorted(best.items(), key=lambda kv: kv[1]["lap_duration"]):
    t0 = dt.datetime.fromisoformat(l["date_start"]); t1 = t0 + dt.timedelta(seconds=l["lap_duration"])
    a = (t0 - dt.timedelta(seconds=2)).isoformat().replace("+00:00", ""); b = (t1 + dt.timedelta(seconds=2)).isoformat().replace("+00:00", "")
    q = f"session_key={SESSION}&driver_number={num}&date>={a}&date<={b}"
    fast[num] = {"lap": l, "car": get("car_data?" + q), "loc": get("location?" + q)}
    print(num, l["lap_duration"], len(fast[num]["car"]), len(fast[num]["loc"])); time.sleep(0.4)
save(f"s{SESSION}_fastest_laps.json", fast)
