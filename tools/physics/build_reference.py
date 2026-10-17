"""Bước 1 vật lý: dữ liệu thật làm chuẩn cho xe mô phỏng (từ 22 vòng nhanh nhất phân hạng Barcelona 2026, OpenF1).

Ra:
- data/telemetry/barcelona_2026_q.json: mỗi tay đua một vòng, lấy mẫu theo quãng đường s (mỗi 5 m):
  thời gian, tốc độ, ga, phanh, số, vòng tua. Để so trực tiếp với xe mô phỏng.
- track.json: thêm stations.z (độ cao tương đối, m), trung vị toạ độ z của 22 vòng.
- data/cars/gearing_2026.json: tỉ số truyền từng số của từng đội = tốc độ / vòng tua khi đạp hết ga,
  và vòng tua lúc lên số.

Ánh xạ thời gian -> s: chiếu vị trí (~3.7 Hz) lên tâm đường, mốc s=0 ở date_start và s=L ở cuối vòng.
"""
import json, datetime as dt, numpy as np
from scipy.spatial import cKDTree
from scipy.ndimage import gaussian_filter1d

z = np.load("data/tracks/barcelona/centreline.npz"); P = z["P"]; L = float(z["L"]); n = len(P); ds = L / n
TJ = json.load(open("data/tracks/barcelona/track.json"))
A = json.load(open("data/openf1/align_to_utm31n.json")); R = np.array(A["R"]); tt = np.array(A["t"])
F = json.load(open("data/openf1/s11303_fastest_laps.json"))
DRV = {d["driver_number"]: d for d in json.load(open("data/openf1/s11303_drivers.json"))}
CARS = json.load(open("data/cars/cars_2026.json")); TEAM_OF = {d["code"]: d["team"] for d in CARS["drivers"]}
kd = cKDTree(P)
utm = lambda q: (np.array([q["x"], q["y"] * A["flip_y"]]) * A["scale"]) @ R.T + tt
ts = lambda d: dt.datetime.fromisoformat(d).timestamp()
STEP = 5.0; GRID = np.arange(0, L, STEP)

def s_track(lt, lxy, t0, t1):
    """s(t) at the location samples: nearest station, unwrapped, pinned to 0 at t0 and L at t1."""
    s = ds * kd.query(lxy)[1].astype(float)
    for k in range(1, len(s)):                                   # unwrap across the control line
        while s[k] - s[k - 1] < -L / 2: s[k:] += L
        while s[k] - s[k - 1] > L / 2: s[k:] -= L
    i0 = np.searchsorted(lt, t0); s -= np.interp(t0, lt, s)     # s = 0 at the lap start
    if np.interp(t0, lt, s) == 0 and s[min(i0 + 3, len(s) - 1)] < 0: s += L
    a = np.interp(t1, lt, s); s *= L / a                         # small stretch so the lap is exactly L (<0.3 %)
    return s, a

out, zs, gear_pts, shift_pts, stretch = {}, [], {}, {}, []
for num, v in F.items():
    d = DRV[int(num)]; code = d["name_acronym"]; team = TEAM_OF[code]
    t0 = ts(v["lap"]["date_start"]); t1 = t0 + v["lap"]["lap_duration"]
    lt = np.array([ts(q["date"]) for q in v["loc"]]); lxy = np.array([utm(q) for q in v["loc"]])
    s_loc, raw_len = s_track(lt, lxy, t0, t1); stretch.append(raw_len / L)
    lz = np.array([q["z"] * A["scale"] for q in v["loc"]])
    m = (s_loc > -50) & (s_loc < L + 50); zs.append(np.stack([s_loc[m] % L, lz[m]], 1))
    ct = np.array([ts(q["date"]) for q in v["car"]]); cs = np.interp(ct, lt, s_loc)
    spd = np.array([q["speed"] for q in v["car"]], float); thr = np.array([q["throttle"] for q in v["car"]], float)
    brk = np.array([100.0 if q["brake"] else 0.0 for q in v["car"]]); gear = np.array([q["n_gear"] for q in v["car"]], float)
    rpm = np.array([q["rpm"] for q in v["car"]], float)
    ok = np.concatenate([[True], np.diff(cs) > 0])               # strictly increasing s for interpolation
    cs, ct, spd, thr, brk, gear, rpm = cs[ok], ct[ok], spd[ok], thr[ok], brk[ok], gear[ok], rpm[ok]
    near = lambda a: a[np.clip(np.searchsorted(cs, GRID), 0, len(cs) - 1)]
    t_grid = np.interp(GRID, np.concatenate([[0], s_loc[(s_loc > 0) & (s_loc < L)], [L]]),
                       np.concatenate([[t0], lt[(s_loc > 0) & (s_loc < L)], [t1]])) - t0
    out[code] = {"num": int(num), "team": team, "lap": v["lap"]["lap_duration"],
                 "s1": v["lap"]["duration_sector_1"], "s2": v["lap"]["duration_sector_2"], "s3": v["lap"]["duration_sector_3"],
                 "t": [round(float(x), 3) for x in t_grid], "v": [round(float(x), 1) for x in np.interp(GRID, cs, spd)],
                 "thr": [int(x) for x in np.interp(GRID, cs, thr)], "brk": [int(x) for x in near(brk)],
                 "gear": [int(x) for x in near(gear)], "rpm": [int(x) for x in np.interp(GRID, cs, rpm)]}
    # gearing: v/rpm on samples at full throttle, same gear as the neighbours (not mid-shift)
    for k in range(1, len(spd) - 1):
        if thr[k] >= 98 and gear[k - 1] == gear[k] == gear[k + 1] and rpm[k] > 7000 and 1 <= gear[k] <= 8:
            gear_pts.setdefault(team, {}).setdefault(int(gear[k]), []).append(spd[k] / 3.6 / rpm[k])
        if gear[k + 1] == gear[k] + 1 and thr[k] >= 98: shift_pts.setdefault(team, []).append(max(rpm[k], rpm[k + 1]))
    print(code, team, v["lap"]["lap_duration"], "raw loc length %.4f" % (raw_len / L))

# elevation: median of all laps in 5 m bins, smoothed 15 m, periodic
allz = np.concatenate(zs); b = (allz[:, 0] // STEP).astype(int) % len(GRID)
zb = np.array([np.median(allz[b == k, 1]) if np.any(b == k) else np.nan for k in range(len(GRID))])
ok = ~np.isnan(zb); kk = np.arange(len(GRID)); zb = np.interp(kk, kk[ok], zb[ok], period=len(GRID))
spread = np.array([np.percentile(np.abs(allz[b == k, 1] - zb[k]), 75) if np.sum(b == k) > 4 else np.nan for k in range(len(GRID))])
zb = gaussian_filter1d(zb, 3, mode="wrap"); zst = np.interp(np.arange(n) * ds, GRID, zb, period=L); zst -= zst.min()
TJ["stations"]["z"] = [round(float(x), 2) for x in zst]
# FIA Barcelona 2026 PU information (Art. C5.12.4/C5.12.8): at full throttle the PU power may only be reduced at
# 100 kW/s, except at the start of a power-limited period inside these lap-distance windows (FIA metres -> our s).
FIA_L = 4657.0
TJ["energy_fia"].update({"reduction_rate_kw_s": 100, "recharge_fp_mj": 9.0,
    "reduction_free": [{"from": round(a * L / FIA_L, 1), "to": round(b * L / FIA_L, 1), "quali_only": q} for a, b, q in
                       [(850, 930, False), (3500, 3750, False), (4000, 4150, False), (3750, 4500, True)]],
    "src": "fia PU information doc (Barcelona 2026): recharge per lap, power limited distance, PU power reduction rate and exception windows"})
TJ["stations"]["z_src"] = "openf1 (location z, median of the 22 fastest 2026 Q laps in 5 m bins, smoothed 15 m); relative to the lowest point"
json.dump(TJ, open("data/tracks/barcelona/track.json", "w"), separators=(",", ":"))
print("elevation range %.1f m, median spread between laps %.2f m" % (zst.max(), np.nanmedian(spread)))

gearing = {}
for team, g in sorted(gear_pts.items()):
    ratios = {str(k): round(float(np.median(v)), 6) for k, v in sorted(g.items()) if len(v) >= 3}
    gearing[team] = {"v_per_rpm_ms": ratios, "n_samples": {str(k): len(v) for k, v in sorted(g.items())},
                     "upshift_rpm": int(np.median(shift_pts.get(team, [0]))),
                     "src": "openf1 car data (speed / rpm at full throttle, steady gear; median over both drivers' fastest Q laps)"}
    print(team, ratios, gearing[team]["upshift_rpm"])
json.dump({"track": "barcelona", "session": "2026 Barcelona GP qualifying (OpenF1 11303)", "teams": gearing},
          open("data/cars/gearing_2026.json", "w"), indent=1)
import os; os.makedirs("data/telemetry", exist_ok=True)
json.dump({"session": "2026 Barcelona GP qualifying, fastest lap of each driver (OpenF1 session 11303)", "ds": STEP, "n": len(GRID),
           "units": {"t": "s from the control line", "v": "km/h", "thr": "%", "brk": "0/100", "rpm": "1/min"},
           "src": "openf1 car_data (~3.7 Hz) mapped to track distance via location data", "drivers": out},
          open("data/telemetry/barcelona_2026_q.json", "w"), separators=(",", ":"))
print("loc length / L: median %.4f" % np.median(stretch))
