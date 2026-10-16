"""Bước 2 dựng Barcelona: ghép tâm đường + pit lane + góc cua + mọi vạch 2026 + lưới xuất phát + công trình
thành data/tracks/barcelona/track.json. Mỗi số đều ghi nguồn: "fia", "openf1", "ortho", "osm" hoặc "estimate".

Hệ toạ độ: mét, gốc (0,0) tại tâm đường trên vạch đích (control line), trục x = Đông, y = Bắc (UTM 31N dịch gốc).
s = quãng đường dọc tâm đường tính từ vạch đích, theo chiều đua.
"""
import json, sys, datetime as dt, numpy as np
from scipy.spatial import cKDTree
from scipy.ndimage import gaussian_filter1d
sys.path.insert(0, "tools/track"); from geo_common import *

z = np.load("data/tracks/barcelona/centreline.npz"); P, T, Nl = z["P"], z["T"], z["Nl"]; L = float(z["L"]); n = len(P)
ds = L / n; s = np.arange(n) * ds
ORIGIN = P[0].copy()
N, W = load_osm(); A = json.load(open("data/openf1/align_to_utm31n.json")); kd = cKDTree(P)
FIA_L = 4657.0                                  # FIA centreline length; FIA lap distances are scaled by L/FIA_L
fia = lambda d: d * L / FIA_L
loc = lambda p: [round(float(p[0] - ORIGIN[0]), 2), round(float(p[1] - ORIGIN[1]), 2)]
s_of = lambda xy: float(s[kd.query(xy)[1]])

# ---------------- curvature and corners ----------------
th = np.unwrap(np.arctan2(T[:, 1], T[:, 0])); kappa = np.gradient(th) / ds
ks = gaussian_filter1d(kappa, 6, mode="wrap")
# official 2023+ corner names (14 corners). Apex = local |curvature| peak inside a window known from the FIA
# power-unit document / circuit map order; windows below are lap-distance ranges in metres (this geometry).
CORNERS = [  # number, name, direction, search window [m]
    (1, "Elf", "R", (700, 860)), (2, "", "L", (860, 1000)), (3, "Renault", "R", (1050, 1350)),
    (4, "Repsol", "R", (1450, 1700)), (5, "Seat", "L", (1880, 2060)), (6, "", "L", (2090, 2240)),
    (7, "Würth", "L", (2400, 2560)), (8, "", "R", (2560, 2700)), (9, "Campsa", "R", (2700, 2950)),
    (10, "La Caixa", "L", (3350, 3520)), (11, "", "L", (3520, 3620)), (12, "Banc Sabadell", "R", (3620, 3850)),
    (13, "", "R", (3950, 4120)), (14, "New Holland", "R", (4150, 4450))]
corners = []
for num, name, dirn, (a, b) in CORNERS:
    i0, i1 = int(a / ds), int(b / ds); seg = ks[i0:i1] * (1 if dirn == "L" else -1)
    k = i0 + int(np.argmax(seg)); corners.append({"n": num, "name": name, "dir": dirn, "apex_s": round(float(s[k]), 1),
        "radius_m": round(float(1 / max(abs(ks[k]), 1e-4)), 1), "xy": loc(P[k]), "src": "ortho+openf1 (apex = curvature peak)"})

# ---------------- pit lane ----------------
pit_raw = way_pts(N, W, [33742214, 178416729, 178416733])
from scipy.interpolate import splprep, splev
tck, _ = splprep([pit_raw[:, 0], pit_raw[:, 1]], s=len(pit_raw) * 0.3)
u = np.linspace(0, 1, 6000); px, py = splev(u, tck); seg = np.hypot(np.diff(px), np.diff(py)); cum = np.concatenate([[0], np.cumsum(seg)])
PL = cum[-1]; pn = int(PL); ps = np.linspace(0, PL, pn + 1); uu = np.interp(ps, cum, u); px, py = splev(uu, tck)
pit = np.stack([px, py], 1)
pit_track_s = np.array([s_of(p) for p in pit]); pit_off = np.array([float(np.dot(p - P[kd.query(p)[1]], Nl[kd.query(p)[1]])) for p in pit])
# garages: OSM "Boxes" building projected on the pit path
boxes = way_pts(N, W, [33742578]); pkd = cKDTree(pit); bj = pkd.query(boxes)[1]
gar0, gar1 = float(ps[bj.min()]), float(ps[bj.max()])
LIMIT_LEN = 368.0                                                   # FIA: pit lane under speed-limit control
mid = (gar0 + gar1) / 2; lim0, lim1 = mid - LIMIT_LEN / 2, mid + LIMIT_LEN / 2
# Garage order from the FIA F2 Barcelona 2026 pit-lane drawing (F1 garages), from the pit entry:
# FOM, FIA x4, then 4 units per team in this order, then FOM -> 50 units along the "Boxes" building frontage.
TEAMS = ["mclaren", "mercedes", "redbull", "ferrari", "williams", "vcarb", "aston", "haas", "audi", "alpine", "cadillac"]
UNITS = 50; unit = (gar1 - gar0) / UNITS
def pit_pt(d): i = int(np.clip(round(d), 0, pn)); return pit[i], i
def pit_side(i):                                              # unit normal of pit path pointing to the garages
    t = pit[min(i + 1, pn)] - pit[max(i - 1, 0)]; t /= np.linalg.norm(t); nn = np.array([-t[1], t[0]])
    return nn if np.dot(boxes.mean(0) - pit[i], nn) > 0 else -nn
pit_boxes = []
for k, team in enumerate(TEAMS):
    d = gar0 + unit * (5 + 4 * k + 2); p, i = pit_pt(d); g = pit_side(i)
    pit_boxes.append({"team": team, "pit_s": round(d, 1), "stop_xy": loc(p + g * 6.0), "garage_xy": loc(p + g * 15.2),
                      "src": "fia (2026 Barcelona pit lane drawing: order) + osm (Boxes building: extent); lateral offsets estimate"})

# ---------------- timing / control lines ----------------
brake = []
F = json.load(open("data/openf1/s11303_fastest_laps.json"))
R = np.array(A["R"]); tt = np.array(A["t"])
utm = lambda q: (np.array([q["x"], q["y"] * A["flip_y"]]) * A["scale"]) @ R.T + tt
ts = lambda d: dt.datetime.fromisoformat(d).timestamp()
for v in F.values():                                           # T1 braking point: first brake after 400 m
    lt = np.array([ts(q["date"]) for q in v["loc"]]); lxy = np.array([utm(q) for q in v["loc"]])
    for q in v["car"]:
        t = ts(q["date"])
        if q["brake"] and t > ts(v["lap"]["date_start"]):
            sb = s_of(np.array([np.interp(t, lt, lxy[:, 0]), np.interp(t, lt, lxy[:, 1])]))
            if 400 < sb < 900: brake.append(sb); break
t1_brake = float(np.median(brake))
# Pole box: front of the painted grid boxes read off the orthophoto (yellow box marks end at s~92 m, +-5 m).
# Cross-check: Pirelli/FIA "pole to first braking zone 565 m" -> braking at ~657 m; OpenF1 quali braking median is
# t1_brake (later, as expected from 3.7 Hz sampling and quali speeds).
pole_s = 92.0
lines = [
    {"id": "control", "s": 0.0, "src": "openf1 (lap start crossings, 22 drivers); = finish line"},
    {"id": "start", "s": 126.0, "src": "fia (start/finish line offset 0.126 km, 2018/2022 FIA previews) + ortho (painted line at s~126)"},
    {"id": "sector1", "s": round(float(z["sector1"]), 1), "src": "openf1 (sector times)"},
    {"id": "sector2", "s": round(float(z["sector2"]), 1), "src": "openf1 (sector times)"},
    {"id": "speed_trap", "s": float(z["st"]), "src": "openf1 (speed matched, +-25 m)"},
    {"id": "i1", "s": float(z["i1"]), "src": "openf1 (speed matched, +-25 m)"},
    {"id": "i2", "s": float(z["i2"]), "src": "openf1 (speed matched, +-25 m)"},
    {"id": "overtake_detection", "s": round(fia(4047), 1), "src": "fia (PU information doc, L19 apex T13)"},
    {"id": "overtake_activation", "s": round(fia(4271), 1), "src": "fia (PU information doc, L20/SC1 entry T14)"},
    {"id": "sc1", "s": round(fia(4271), 1), "src": "fia (L20/SC1)"},
    {"id": "pit_entry", "s": round(float(pit_track_s[0]), 1), "src": "osm (pit entry road leaves the track)"},
    {"id": "pit_exit", "s": round(float(pit_track_s[-1]), 1), "src": "osm (pit exit road joins the track)"},
    {"id": "sc2", "s": round(float(pit_track_s[-1]), 1), "src": "estimate (at pit exit merge)"},
    {"id": "t1_braking_ref", "s": round(t1_brake, 1), "src": "openf1 (first brake, median of 22 Q laps)"},
]
# Straight Mode zones (FIA: pit straight, T3-T4, T5-T7, T9-T10). Exact lap distances not published in the
# documents we have -> estimate: from 60 m after the previous corner apex to 120 m before the next apex.
def cs(nn): return next(c["apex_s"] for c in corners if c["n"] == nn)
straight_mode = [
    {"from": round(cs(14) + 120, 1), "to": round(cs(1) - 170, 1), "name": "pit straight"},
    {"from": round(cs(3) + 120, 1), "to": round(cs(4) - 120, 1), "name": "T3-T4"},
    {"from": round(cs(5) + 60, 1), "to": round(cs(7) - 110, 1), "name": "T5-T7"},
    {"from": round(cs(9) + 90, 1), "to": round(cs(10) - 150, 1), "name": "T9-T10"},
]
for z_ in straight_mode: z_["src"] = "estimate (FIA names the 4 zones; distances estimated)"

# ---------------- grid (22 slots, pole on the left, 8 m stagger) ----------------
grid = []
for k in range(22):
    sk = (pole_s - 8.0 * k) % L; i = int(sk / ds) % n; side = 1 if k % 2 == 0 else -1          # +1 = left
    off = side * min(z["wl"][i], z["wr"][i]) * 0.45
    grid.append({"pos": k + 1, "s": round(sk, 1), "offset": round(float(off), 2), "xy": loc(P[i] + Nl[i] * off),
                 "src": "ortho (pole box) + fia (8 m stagger, pole on the left)"})

# ---------------- structures (OSM) ----------------
def poly(i): return [loc(p) for p in way_pts(N, W, [i])]
structures = []
for i, w in W.items():
    t = w.get("tags", {}); kind = None
    if t.get("building") == "grandstand" or t.get("leisure") == "bleachers": kind = "grandstand"
    elif "building" in t: kind = "building"
    elif t.get("natural") == "shingle": kind = "gravel"
    elif t.get("barrier") == "wall": kind = "wall"
    elif t.get("barrier") == "fence": kind = "fence"
    if not kind: continue
    q = way_pts(N, W, [i])
    if kd.query(q)[0].min() > 400: continue
    structures.append({"kind": kind, "name": t.get("name", ""), "pts": [loc(p) for p in q], "osm_way": i})

track = {
    "name": "Circuit de Barcelona-Catalunya", "layout": "2023+ (F1 2026)", "length_m": round(L, 1), "fia_length_m": FIA_L,
    "laps_race": 66, "direction": "clockwise",
    "origin_utm31n": [round(float(ORIGIN[0]), 2), round(float(ORIGIN[1]), 2)],
    "sources": {
        "osm": "© OpenStreetMap contributors, ODbL 1.0 (centreline, pit lane, buildings, gravel, walls)",
        "ortho": "Ortofoto 25 cm 2025 © Institut Cartogràfic i Geològic de Catalunya (ICGC), CC BY 4.0 (edges, kerbs, surfaces)",
        "openf1": "OpenF1 API, 2026 Barcelona GP qualifying (control/sector lines, speed points, T1 braking)",
        "fia": "FIA 2026 Barcelona-Catalunya GP Race Director notes + Power Unit Information (overtake lines, pit limit 368 m)",
        "estimate": "values marked estimate are reasoned guesses, to be replaced when better data exists"},
    "stations": {"ds": round(ds, 4), "count": n,
                 "x": [round(float(v), 2) for v in P[:, 0] - ORIGIN[0]], "y": [round(float(v), 2) for v in P[:, 1] - ORIGIN[1]],
                 "w_left": [round(float(v), 2) for v in z["wl"]], "w_right": [round(float(v), 2) for v in z["wr"]],
                 "kerb_left": [round(float(v), 2) for v in z["kl"]], "kerb_right": [round(float(v), 2) for v in z["kr"]]},
    "corners": corners, "lines": lines, "straight_mode": straight_mode,
    "pit": {"path": [loc(p) for p in pit], "length_m": round(PL, 1), "track_s": [round(float(v), 1) for v in pit_track_s],
            "limit_from": round(lim0, 1), "limit_to": round(lim1, 1), "limit_kmh": 80, "garages_from": round(gar0, 1), "garages_to": round(gar1, 1),
            "fast_lane_w": 6.0, "working_lane_w": 6.0, "boxes": pit_boxes,
            "src": "osm path; fia 368 m limit; lane widths estimate"},
    "grid": grid, "structures": structures,
    "energy_fia": {"recharge_race_mj": 8.5, "recharge_race_overtake_mj": 9.0, "recharge_quali_mj": 7.0, "power_limited_distance_m": 2440,
                   "src": "fia PU information doc"},
}
json.dump(track, open("data/tracks/barcelona/track.json", "w"), separators=(",", ":"))
print(f"L={L:.1f}  pit {PL:.0f} m, garages {gar0:.0f}-{gar1:.0f} on pit path, limit {lim0:.0f}-{lim1:.0f}")
print("T1 braking s=%.0f -> pole s=%.0f" % (t1_brake, pole_s))
for c in corners: print(f"T{c['n']:<2} {c['dir']} apex {c['apex_s']:7.1f}  R={c['radius_m']}")
for l in lines: print(l["id"], l["s"])
for z_ in straight_mode: print("SM", z_)
print("structures", len(structures))
