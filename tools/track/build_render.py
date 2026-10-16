"""Bước 4: lớp đồ hoạ vector cho game (phong cách V11) từ dữ liệu đã dựng.

surface.png là bản đồ cho vật lý (mỗi ô 0.5 m), nhìn lốm đốm như ảnh. Ở đây ta làm sạch nó thành vài đa giác
mượt: vùng chạy được giữa hai hàng rào (nền cỏ), run-off nhựa, run-off sơn, bẫy sỏi (OSM). Mặt đường, kerb,
pit, rào được vẽ trực tiếp từ track.json. Kết quả: data/tracks/barcelona/render.json.
"""
import json, numpy as np
from PIL import Image
from scipy.ndimage import binary_closing, binary_opening, label
from rasterio.features import shapes
from rasterio.transform import Affine
from shapely.geometry import Polygon, shape, mapping
from shapely.ops import unary_union

tr = json.load(open("data/tracks/barcelona/track.json")); st = tr["stations"]; sf = tr["surface"]; C = sf["codes"]
S = np.array(Image.open("data/tracks/barcelona/surface.png"))
X, Y = np.array(st["x"]), np.array(st["y"]); n = len(X)
tx, ty = np.roll(X, -1) - np.roll(X, 1), np.roll(Y, -1) - np.roll(Y, 1); l = np.hypot(tx, ty); nx, ny = -ty / l, tx / l
def side(off): return np.stack([X + nx * off, Y + ny * off], 1)
def clean(p): p = p.buffer(0); return p if p.is_valid else p.buffer(0)

# Drivable domain = the connected patch of open ground (track, kerb, asphalt, paint, gravel, grass, dirt, pit)
# that touches the track, bounded by trees, buildings and walls, at most CAP metres from the track.
from scipy.ndimage import distance_transform_edt, binary_dilation
CAP = 70
open_ground = np.isin(S, [C[k] for k in ("track", "kerb", "asphalt", "paint", "gravel", "grass", "dirt", "pit")])
dist = distance_transform_edt(S != C["track"]) * sf["res_m"]
reach = open_ground & (dist <= CAP)
reach = binary_opening(reach, iterations=3)                    # cut 1-2 m leaks between separate areas
lab_, _ = label(reach); keep_ = np.unique(lab_[S == C["track"]]); keep_ = keep_[keep_ > 0]
reach = np.isin(lab_, keep_)
reach = binary_closing(reach, iterations=4)
T0 = Affine(sf["res_m"], 0, sf["x0"], 0, -sf["res_m"], sf["y1"])
domain = unary_union([shape(g) for g, v in shapes(reach.astype(np.uint8), mask=reach, transform=T0) if v == 1])
domain = domain.buffer(6).buffer(-12).buffer(6).simplify(0.2)        # rounded outlines, no wiggles under ~12 m
domain = unary_union([g for g in getattr(domain, "geoms", [domain]) if g.area > 2000])
from scipy.ndimage import uniform_filter1d
def smooth_ring(ring, win=21):
    """Resample a ring every 1 m and average positions over `win` metres along it: walls and tecpro lines are
    built straight or as smooth arcs, so classification wiggles are removed without creating loops."""
    c = np.array(ring.coords)[:-1]; seg = np.r_[0, np.cumsum(np.hypot(*np.diff(np.vstack([c, c[:1]]), axis=0).T))]
    L_ = seg[-1]; t = np.arange(0, L_, 1.0); cc = np.vstack([c, c[:1]])
    xs, ys = np.interp(t, seg, cc[:, 0]), np.interp(t, seg, cc[:, 1])
    if len(t) < 3 * win: return np.c_[xs, ys]
    return np.c_[uniform_filter1d(xs, win, mode="wrap"), uniform_filter1d(ys, win, mode="wrap")]
def smooth_poly(g):
    return Polygon(smooth_ring(g.exterior), [smooth_ring(h) for h in g.interiors if Polygon(h).area > 400]).buffer(0)
domain = unary_union([smooth_poly(g) for g in getattr(domain, "geoms", [domain])])

T = Affine(sf["res_m"], 0, sf["x0"], 0, -sf["res_m"], sf["y1"])
def vectorize(mask, min_m2=40, smooth=0.75, clip=None):
    mask = binary_opening(binary_closing(mask, iterations=2), iterations=1)
    lab, k = label(mask); sizes = np.bincount(lab.ravel()); keep = sizes * sf["res_m"] ** 2 >= min_m2; keep[0] = False
    mask = keep[lab]
    polys = [shape(g) for g, v in shapes(mask.astype(np.uint8), mask=mask, transform=T) if v == 1]
    u = unary_union(polys).buffer(smooth).buffer(-2 * smooth).buffer(smooth).simplify(0.2)
    return u.intersection(domain if clip is None else clip)
# real run-off asphalt and painted areas always join the track edge / kerbs: drop blobs that do not
kk = np.maximum(np.array(st["kerb_left"]), 0); kr_ = np.maximum(np.array(st["kerb_right"]), 0)
ring_l, ring_r = Polygon(side(np.array(st["w_left"]) + kk)), Polygon(side(-np.array(st["w_right"]) - kr_))
ro, ri = (ring_l, ring_r) if clean(ring_l).area > clean(ring_r).area else (ring_r, ring_l)
track_band = clean(clean(ro).difference(clean(ri)))
def touching(geom, d):
    near = track_band.buffer(d)
    return unary_union([g for g in getattr(geom, "geoms", [geom]) if not g.is_empty and g.intersects(near)])
asphalt = touching(vectorize(np.isin(S, [C["asphalt"], C["pit"]]), min_m2=200, smooth=2.5), 2.5)
paint = touching(vectorize(S == C["paint"], min_m2=40, smooth=1.2), 1.5)
gravel = vectorize(S == C["gravel"], min_m2=60, smooth=2.0)
trees = vectorize(S == C["obstacle"], min_m2=25, smooth=1.5, clip=domain.buffer(120).difference(domain.buffer(1)))   # tree canopies outside the run-off

def rings(geom):
    out = []
    for g in getattr(geom, "geoms", [geom]):
        if g.is_empty or g.geom_type != "Polygon": continue
        out.append([[round(x, 2) for xy in g.exterior.coords for x in xy]] + [[round(x, 2) for xy in h.coords for x in xy] for h in g.interiors])
    return out
render = {"domain": rings(domain), "asphalt": rings(asphalt), "paint": rings(paint), "gravel": rings(gravel), "trees": rings(trees),
          "note": "flat [x0,y0,x1,y1,...] rings; first ring outer, rest holes. Local metres, same frame as track.json"}
json.dump(render, open("data/tracks/barcelona/render.json", "w"), separators=(",", ":"))
for k in ("domain", "asphalt", "paint", "gravel", "trees"): print(k, len(render[k]), "polys", round(sum(Polygon(np.reshape(r[0], (-1, 2))).area for r in render[k])), "m2")

# ---- barriers = boundary of the smoothed drivable domain (no self-intersections); write back for physics ----
from shapely.geometry import LineString, Point
from shapely.prepared import prep
bound = domain.boundary
wl, wr = np.array(st["w_left"]), np.array(st["w_right"])
def ray(i, sign, start):
    a = np.array([X[i], Y[i]]) + sign * np.array([nx[i], ny[i]]) * start
    b = a + sign * np.array([nx[i], ny[i]]) * 120
    hit = LineString([a, b]).intersection(bound)
    if hit.is_empty: return start + 120
    pts = [hit] if hit.geom_type == "Point" else [g for g in getattr(hit, "geoms", []) if g.geom_type == "Point"]
    return start + min(Point(a).distance(p) for p in pts) if pts else start + 120
bl = np.array([ray(i, +1, wl[i]) for i in range(n)]); br = np.array([ray(i, -1, wr[i]) for i in range(n)])
tr["stations"]["barrier_left"] = [round(float(v), 2) for v in bl]; tr["stations"]["barrier_right"] = [round(float(v), 2) for v in br]
tr["stations"]["barrier_src"] = "boundary of the drivable area (orthophoto surface classes + OSM gravel, smoothed 4 m), ray-cast along the normal"
json.dump(tr, open("data/tracks/barcelona/track.json", "w"), separators=(",", ":"))
render["barriers"] = [[round(x, 2) for xy in ring.coords for x in xy] for g in getattr(domain, "geoms", [domain]) for ring in [g.exterior, *g.interiors]]
json.dump(render, open("data/tracks/barcelona/render.json", "w"), separators=(",", ":"))
print("barriers", len(render["barriers"]), "rings; median distance from edge L %.1f R %.1f" % (np.median(bl - wl), np.median(br - wr)))
