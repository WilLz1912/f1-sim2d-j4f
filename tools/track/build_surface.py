"""Bước 3 dựng Barcelona: bản đồ mặt đất 0.5 m (nhựa, kerb, sơn, cỏ, sỏi, pit, rào, công trình) và đường rào chắn.

Rào chắn (tecpro, armco, tường) không có trong OSM. Ước từ ảnh: đi ra ngoài theo pháp tuyến từ mép đường qua
vùng chạy được (nhựa, sơn, sỏi, cỏ), dừng ở vật cản đầu tiên kéo dài >= 1 m (bóng đổ của rào, cây, công trình).
Kết quả: data/tracks/barcelona/surface.png (mỗi pixel 0.5 m, giá trị = mã mặt đất) + barrier_left/right trong track.json.
"""
import json, sys, numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import median_filter, binary_opening, minimum_filter1d
sys.path.insert(0, "tools/track"); from geo_common import *

SURF = {"none": 0, "track": 1, "kerb": 2, "asphalt": 3, "paint": 4, "grass": 5, "gravel": 6, "pit": 7, "barrier": 8,
        "building": 9, "dirt": 10, "obstacle": 11}
tr = json.load(open("data/tracks/barcelona/track.json")); st = tr["stations"]
z = np.load("data/tracks/barcelona/centreline.npz"); P, Nl = z["P"], z["Nl"]; n = len(P)
ORIGIN = np.array(tr["origin_utm31n"]); O = Ortho(); N, W = load_osm()
RES = 0.5; PAD = 160
lo = P.min(0) - PAD; hi = P.max(0) + PAD; GW, GH = int((hi[0] - lo[0]) / RES), int((hi[1] - lo[1]) / RES)
# world centre of each grid cell -> ortho sample (2x2 average via 0.25 m offsets)
gx = lo[0] + (np.arange(GW) + 0.5) * RES; gy = hi[1] - (np.arange(GH) + 0.5) * RES
X, Y = np.meshgrid(gx, gy)
rgb = sum(O.sample(np.stack([X + dx, Y + dy], -1)) for dx in (-0.125, 0.125) for dy in (-0.125, 0.125)) / 4
c = classify(rgb)
S = np.full((GH, GW), SURF["dirt"], np.uint8)
S[c == C_GREY] = SURF["asphalt"]; S[c == C_WHITE] = SURF["asphalt"]
S[(c == C_GREENPAINT) | (c == C_RED)] = SURF["paint"]; S[c == C_GRASS] = SURF["grass"]; S[c == C_DARK] = SURF["obstacle"]
del rgb, X, Y
img = Image.fromarray(S); d = ImageDraw.Draw(img)
g = lambda p: ((p[0] - lo[0]) / RES, (hi[1] - p[1]) / RES)
for w in W.values():                                           # OSM polygons
    t = w.get("tags", {}); pts = [g(N[k]) for k in w["nodes"] if k in N]
    if len(pts) < 3: continue
    if t.get("natural") == "shingle": d.polygon(pts, fill=SURF["gravel"])
    elif "building" in t: d.polygon(pts, fill=SURF["building"])
for w in W.values():
    t = w.get("tags", {}); pts = [g(N[k]) for k in w["nodes"] if k in N]
    if t.get("barrier") == "wall" and len(pts) > 1: d.line(pts, fill=SURF["barrier"], width=2)
# pit lane: 6 m fast lane on the track side of the path + 6 m working lane on the garage side (estimate)
pit = np.array(tr["pit"]["path"]) + ORIGIN
for k in range(len(pit) - 1):
    a, b = pit[k], pit[k + 1]; t = (b - a) / (np.linalg.norm(b - a) + 1e-9); nn = np.array([-t[1], t[0]])
    d.polygon([g(a + nn * 6), g(b + nn * 6), g(b - nn * 6), g(a - nn * 6)], fill=SURF["pit"])
# track and kerbs
wl, wr, kl, kr = map(np.array, (st["w_left"], st["w_right"], st["kerb_left"], st["kerb_right"]))
EL, ER = P + Nl * wl[:, None], P - Nl * wr[:, None]
for k in range(n):
    j = (k + 1) % n
    for E, Kw, sg in ((EL, kl, 1), (ER, kr, -1)):
        if Kw[k] > 0 or Kw[j] > 0:
            d.polygon([g(E[k]), g(E[j]), g(E[j] + sg * Nl[j] * max(Kw[j], Kw[k])), g(E[k] + sg * Nl[k] * max(Kw[k], Kw[j]))], fill=SURF["kerb"])
    d.polygon([g(EL[k]), g(EL[j]), g(ER[j]), g(ER[k])], fill=SURF["track"])
S = np.array(img)

# ---------------- barriers ----------------
DRIVE = np.isin(S, [SURF["track"], SURF["kerb"], SURF["asphalt"], SURF["paint"], SURF["gravel"], SURF["grass"], SURF["dirt"], SURF["pit"]])
STOP = np.isin(S, [SURF["obstacle"], SURF["building"], SURF["barrier"], SURF["track"]])   # track here = another part of the circuit
OFF = np.arange(0, 80, 0.5)          # beyond 80 m a car has stopped in the run-off anyway
def scan_barrier(sign, edge, kerb):
    XY = P[:, None, :] + sign * Nl[:, None, :] * (edge + kerb)[:, None, None] + sign * Nl[:, None, :] * OFF[None, :, None]
    ci = np.clip(((XY[..., 0] - lo[0]) / RES).astype(int), 0, GW - 1); ri = np.clip(((hi[1] - XY[..., 1]) / RES).astype(int), 0, GH - 1)
    stop = STOP[ri, ci]; pit_ = S[ri, ci] == SURF["pit"]
    run = minimum_filter1d(stop.astype(np.uint8), 2, axis=1) > 0      # >= 1 m of obstacle
    run[:, :4] = False                                                 # at least 2 m of run-off everywhere
    k = np.where(run.any(1), run.argmax(1), len(OFF) - 1)
    dist = OFF[k]
    # the pit wall: the pit lane next to the main straight is behind a wall right at the track edge
    pw = pit_[:, 1:12].any(1); dist[pw] = np.minimum(dist[pw], OFF[np.argmax(pit_[pw, :], 1)] - 0.5)
    hit_track = S[ri, ci][np.arange(len(k)), k] == SURF["track"]
    dist[hit_track] = dist[hit_track] / 2                              # wall half-way to the neighbouring section
    dist = median_filter(dist, 9, mode="wrap")
    for _ in range(2):                                                 # continuity: barrier moves <= 0.35 m per metre
        for i in range(1, 2 * len(dist)): j = i % len(dist); dist[j] = min(dist[j], dist[j - 1] + 0.35)
        for i in range(2 * len(dist) - 2, -1, -1): j = i % len(dist); dist[j] = min(dist[j], dist[(j + 1) % len(dist)] + 0.35)
    return dist                                                        # measured from the kerb's outer edge
bl, br = scan_barrier(+1, wl, kl), scan_barrier(-1, wr, kr)
BL, BR = P + Nl * (wl + kl + bl)[:, None], P - Nl * (wr + kr + br)[:, None]
img = Image.fromarray(S); d = ImageDraw.Draw(img)
for B in (BL, BR): d.line([g(p) for p in np.vstack([B, B[:1]])], fill=SURF["barrier"], width=2)
S = np.array(img); Image.fromarray(S).save("data/tracks/barcelona/surface.png", optimize=True)
tr["surface"] = {"file": "surface.png", "res_m": RES, "x0": round(float(lo[0] - ORIGIN[0]), 2), "y1": round(float(hi[1] - ORIGIN[1]), 2),
                 "w": GW, "h": GH, "codes": SURF,
                 "src": "ortho classification (asphalt/paint/grass/dirt/obstacle) + osm (gravel, buildings, walls) + vector track/kerbs/pit"}
tr["stations"]["barrier_left"] = [round(float(v + a + b), 2) for v, a, b in zip(wl, kl, bl)]
tr["stations"]["barrier_right"] = [round(float(v + a + b), 2) for v, a, b in zip(wr, kr, br)]
tr["stations"]["barrier_src"] = "ortho (first obstacle beyond the run-off, median 9 m); review overrides in tools/track/barrier_overrides.json"
json.dump(tr, open("data/tracks/barcelona/track.json", "w"), separators=(",", ":"))
u, cnt = np.unique(S, return_counts=True)
print({k: round(int(cnt[list(u).index(v)]) * RES * RES) for k, v in SURF.items() if v in u}, "m2")
print("barrier dist from edge (m) median L %.1f R %.1f, p95 L %.1f R %.1f" % (np.median(kl + bl), np.median(kr + br), np.percentile(kl + bl, 95), np.percentile(kr + br, 95)))
