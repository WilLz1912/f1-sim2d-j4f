"""Dấu vân tay hiệu năng thật của từng xe ở phân hạng Barcelona 2026 (OpenF1): lap, sector, speed trap,
tốc độ tối thiểu ở góc chậm/nhanh, tốc độ cao nhất. Dùng làm mục tiêu hiệu chỉnh vật lý (M2).
Lưu ý: car_data ~3.7 Hz nên tốc độ min/max có sai số vài km/h."""
import json, sys, datetime as dt, numpy as np
from scipy.spatial import cKDTree
z = np.load("data/tracks/barcelona/centreline.npz"); P = z["P"]; kd = cKDTree(P); L = float(z["L"])
T = json.load(open("data/tracks/barcelona/track.json")); C = {c["n"]: c["apex_s"] for c in T["corners"]}
A = json.load(open("data/openf1/align_to_utm31n.json")); R = np.array(A["R"]); t0 = np.array(A["t"])
F = json.load(open("data/openf1/s11303_fastest_laps.json")); D = {str(d["driver_number"]): d for d in json.load(open("data/openf1/s11303_drivers.json"))}
ts = lambda d: dt.datetime.fromisoformat(d).timestamp()
utm = lambda q: (np.array([q["x"], q["y"] * A["flip_y"]]) * A["scale"]) @ R.T + t0
out = {}
for num, v in F.items():
    lt = np.array([ts(q["date"]) for q in v["loc"]]); lxy = np.array([utm(q) for q in v["loc"]])
    ct = np.array([ts(q["date"]) for q in v["car"]]); sp = np.array([q["speed"] for q in v["car"]], float)
    a, b = ts(v["lap"]["date_start"]), ts(v["lap"]["date_start"]) + v["lap"]["lap_duration"]
    m = (ct >= a) & (ct <= b); ct, sp = ct[m], sp[m]
    s = np.array([float(kd.query([np.interp(t, lt, lxy[:, 0]), np.interp(t, lt, lxy[:, 1])])[1]) for t in ct])
    def vmin(sc, w=60):
        d = (s - sc + L / 2) % L - L / 2; k = np.abs(d) < w; return int(sp[k].min()) if k.any() else None
    d = D[num]; lap = v["lap"]
    out[d["name_acronym"]] = {"num": int(num), "team": d["team_name"], "lap": lap["lap_duration"],
        "s1": lap["duration_sector_1"], "s2": lap["duration_sector_2"], "s3": lap["duration_sector_3"],
        "st": lap["st_speed"], "i1": lap["i1_speed"], "i2": lap["i2_speed"], "vmax": int(sp.max()),
        "min_T1": vmin(C[1]), "min_T3": vmin(C[3], 120), "min_T5": vmin(C[5]), "min_T9": vmin(C[9]), "min_T10": vmin(C[10]), "min_T12": vmin(C[12]), "min_T14": vmin(C[14])}
json.dump(out, open("data/cars/barcelona_2026_q_targets.json", "w"), indent=1)
hdr = ["lap", "s1", "s2", "s3", "st", "vmax", "min_T1", "min_T3", "min_T5", "min_T9", "min_T10", "min_T12", "min_T14"]
print("drv team                 " + " ".join(f"{h:>7}" for h in hdr))
for k, r in sorted(out.items(), key=lambda kv: kv[1]["lap"]):
    print(f"{k} {r['team'][:20]:20} " + " ".join(f"{r[h]:>7}" for h in hdr))
