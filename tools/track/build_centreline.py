"""Bước 1 dựng Barcelona: tâm đường, mép đường, kerb, và các vạch tính giờ.

Nguồn:
  - Tâm đường thô: OpenStreetMap (ODbL), vòng F1 chọn bằng cách khớp với vết chạy thật OpenF1.
  - Mép đường và kerb: đo trên ảnh trực giao ICGC 25 cm (CC BY 4.0), quét vuông góc mỗi 1 m.
  - Vạch đích, vạch sector, điểm đo tốc độ: suy ra từ dữ liệu phân hạng 2026 (OpenF1, 22 vòng nhanh nhất).
Kết quả: data/tracks/barcelona/centreline.npz (dùng cho các bước sau) và in số liệu kiểm tra.
"""
import json, sys, datetime as dt, numpy as np
from scipy.ndimage import median_filter
sys.path.insert(0, "tools/track"); from geo_common import *

N, W = load_osm(); A = json.load(open("data/openf1/align_to_utm31n.json")); O = Ortho()
OFF = np.arange(0, 24, 0.125)

def scan_edges(P, Nl):
    """Distance from centre to the first sustained non-asphalt pixel run (white line / kerb / paint / gravel / grass)."""
    out = []
    for sign in (+1, -1):
        c = classify(O.sample(P[:, None, :] + sign * Nl[:, None, :] * OFF[None, :, None]))
        bad = np.isin(c, [C_WHITE, C_RED, C_GREENPAINT, C_BEIGE, C_GRASS])
        run = np.apply_along_axis(lambda r: np.convolve(r, np.ones(3), "same") >= 3, 1, bad)
        run[:, :16] = False                                   # first 2 m are always track
        k = np.where(run.any(1), run.argmax(1), -1)
        e = np.where(k > 0, OFF[np.maximum(k, 0)], np.nan)
        e[e > 9.0] = np.nan          # no half-width at Barcelona exceeds ~8 m (TUM); longer scans ran into grey run-off/grid area
        i = np.arange(len(e)); ok = ~np.isnan(e)
        out.append(median_filter(np.interp(i, i[ok], e[ok], period=len(e)), 21, mode="wrap"))
    return out

# --- centreline, re-centred twice on the detected edges ---
P, T, Nl, s, L = resample_closed(way_pts(N, W, A["loop"]), 1.0, smooth=0.5)
for it in range(2):
    wl, wr = scan_edges(P, Nl)
    C = P + Nl * ((wl - wr) / 2)[:, None]
    P, T, Nl, s, L = resample_closed(C[::4], 1.0, smooth=0.05)
wl, wr = scan_edges(P, Nl)
print(f"centreline {L:.1f} m, width median {np.median(wl + wr):.2f} (p5 {np.percentile(wl + wr, 5):.2f}, p95 {np.percentile(wl + wr, 95):.2f})")

# --- kerbs: contiguous red/white band starting at the track edge ---
def scan_kerb(sign, edge):
    """Kerb = band next to the track edge that is striped red/white ALONG the track.
    Sampled every 0.25 m along s (stripes are ~1 m, 1 m stations would alias). Solid paint is not striped."""
    from scipy.ndimage import maximum_filter1d, uniform_filter1d
    n = len(P); sub = np.arange(0, n, 0.25); i0 = sub.astype(int); fr = (sub - i0)[:, None]; i1 = (i0 + 1) % n
    Ps = P[i0] * (1 - fr) + P[i1] * fr; Ns = Nl[i0] * (1 - fr) + Nl[i1] * fr; Es = edge[i0] * (1 - fr[:, 0]) + edge[i1] * fr[:, 0]
    off = np.arange(-0.5, 3.0, 0.125)
    rgb = O.sample(Ps[:, None, :] + sign * Ns[:, None, :] * (Es[:, None] + off[None, :])[..., None])
    c = classify(rgb); h, sat, v = hsv(rgb)
    red = (c == C_RED) | (((h < 20) | (h > 335)) & (sat > 0.18) & (v > 0.35))
    white = (c == C_WHITE) | ((sat < 0.12) & (v > 0.75))
    win = 13                                                   # 3 m window along s
    rc = uniform_filter1d(red.astype(float), win, axis=0, mode="wrap"); wc = uniform_filter1d(white.astype(float), win, axis=0, mode="wrap")
    striped = (rc > 0.12) & (wc > 0.12) & (rc < 0.88)
    striped = np.apply_along_axis(lambda r: np.convolve(r, np.ones(3), "same") >= 2, 1, striped)
    ws = np.zeros(len(sub))
    for j in range(len(sub)):
        r = striped[j, 2:]                                     # from 0.25 m inside the edge
        if not r[:6].any(): continue
        j0 = np.argmax(r); rr = r[j0:]; k = np.argmin(rr) if not rr.all() else len(rr)
        ws[j] = (j0 + k) * 0.125 - 0.25
    width = np.clip(median_filter(ws.reshape(n, 4).max(1), 5, mode="wrap"), 0, 2.5)
    width[width < 0.5] = 0
    on = width > 0                                             # drop kerbs shorter than 6 m
    lab = np.cumsum(np.diff(np.concatenate([[0], on.astype(int)])) == 1) * on
    for k in range(1, lab.max() + 1):
        if (lab == k).sum() < 6: width[lab == k] = 0
    return width
kl, kr = scan_kerb(+1, wl), scan_kerb(-1, wr)

# --- timing lines from OpenF1 (22 fastest laps of Q 2026) ---
F = json.load(open("data/openf1/s11303_fastest_laps.json"))
inv = np.linalg.inv(np.array(A["R"]))
def to_utm(q): return (np.array([q["x"], q["y"] * A["flip_y"]]) * A["scale"]) @ np.array(A["R"]).T + np.array(A["t"])
def ts(d): return dt.datetime.fromisoformat(d).timestamp()
from scipy.spatial import cKDTree
kd = cKDTree(P)
def s_at(xy): return s[kd.query(xy)[1]]
def pos_at(loc, t):
    tt = np.array([ts(q["date"]) for q in loc]); xy = np.array([to_utm(q) for q in loc])
    return np.array([np.interp(t, tt, xy[:, 0]), np.interp(t, tt, xy[:, 1])])
ctrl, sec1, sec2, trap = [], [], [], {"i1": [], "i2": [], "st": []}
for v in F.values():
    l, loc, car = v["lap"], v["loc"], v["car"]
    t0 = ts(l["date_start"])
    ctrl.append(s_at(pos_at(loc, t0)))
    sec1.append(s_at(pos_at(loc, t0 + l["duration_sector_1"])))
    sec2.append(s_at(pos_at(loc, t0 + l["duration_sector_1"] + l["duration_sector_2"])))
def circ_median(a):
    a = np.array(a); ref = a[0]; d = (a - ref + L / 2) % L - L / 2; return (ref + np.median(d)) % L, np.std(d)
s_ctrl, sd0 = circ_median(ctrl); s1, sd1 = circ_median(sec1); s2, sd2 = circ_median(sec2)
lapd = lambda x: (x - s_ctrl) % L
print(f"control line at loop s={s_ctrl:.0f} (spread {sd0:.1f} m); sector1 line at lap {lapd(s1):.0f} m (spread {sd1:.1f}); sector2 at {lapd(s2):.0f} m (spread {sd2:.1f})")

# speed points: where each driver's speed equals the published trap value, best agreement across drivers
for key, fld in (("i1", "i1_speed"), ("i2", "i2_speed"), ("st", "st_speed")):
    hist = np.zeros(int(L))
    for v in F.values():
        val = v["lap"].get(fld)
        if not val: continue
        tt = np.array([ts(q["date"]) for q in v["car"]]); sp = np.array([q["speed"] for q in v["car"]], float)
        for k in range(len(tt) - 1):
            if (sp[k] - val) * (sp[k + 1] - val) <= 0 and sp[k] != sp[k + 1]:
                tc = tt[k] + (val - sp[k]) / (sp[k + 1] - sp[k]) * (tt[k + 1] - tt[k])
                if ts(v["lap"]["date_start"]) <= tc <= ts(v["lap"]["date_start"]) + v["lap"]["lap_duration"]:
                    i = int(lapd(s_at(pos_at(v["loc"], tc)))) % int(L); hist[max(0, i - 25):i + 25] += 1
    sm = np.convolve(hist, np.ones(31) / 31, "same"); trap[key] = int(np.argmax(sm)); print(f"{key} speed point ~ lap {trap[key]} m (votes {sm.max():.1f}/{len(F)})")

# re-index everything so that s=0 is the control line
k0 = int(round(s_ctrl)) % len(P)
roll = lambda a: np.roll(a, -k0, axis=0)
np.savez("data/tracks/barcelona/centreline.npz", P=roll(P), T=roll(T), Nl=roll(Nl), wl=roll(wl), wr=roll(wr), kl=roll(kl), kr=roll(kr), L=L,
         sector1=lapd(s1), sector2=lapd(s2), i1=trap["i1"], i2=trap["i2"], st=trap["st"])
print("kerb metres L/R:", int((kl > 0).sum()), int((kr > 0).sum()))
