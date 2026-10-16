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

# drivable domain between the two barrier lines (plus a 3 m margin past the track edges everywhere)
BL, BR = Polygon(side(np.array(st["barrier_left"]))), Polygon(side(-np.array(st["barrier_right"])))
EL, ER = Polygon(side(np.array(st["w_left"]) + 3)), Polygon(side(-np.array(st["w_right"]) - 3))
outer, inner = (BL, BR) if clean(BL).area > clean(BR).area else (BR, BL)
eo, ei = (EL, ER) if clean(EL).area > clean(ER).area else (ER, EL)
domain = clean(clean(outer).difference(clean(inner))).union(clean(clean(eo).difference(clean(ei))))
domain = domain.buffer(1.5).buffer(-1.5).simplify(0.3)

T = Affine(sf["res_m"], 0, sf["x0"], 0, -sf["res_m"], sf["y1"])
def vectorize(mask, min_m2=40, smooth=0.75):
    mask = binary_opening(binary_closing(mask, iterations=2), iterations=1)
    lab, k = label(mask); sizes = np.bincount(lab.ravel()); keep = sizes * sf["res_m"] ** 2 >= min_m2; keep[0] = False
    mask = keep[lab]
    polys = [shape(g) for g, v in shapes(mask.astype(np.uint8), mask=mask, transform=T) if v == 1]
    u = unary_union(polys).buffer(smooth).buffer(-smooth).simplify(0.25)
    return u.intersection(domain)
asphalt = vectorize(np.isin(S, [C["asphalt"], C["pit"]]), min_m2=150, smooth=1.5)
paint = vectorize(S == C["paint"], min_m2=40, smooth=0.8)
gravel = vectorize(S == C["gravel"], min_m2=40, smooth=0.8)

def rings(geom):
    out = []
    for g in getattr(geom, "geoms", [geom]):
        if g.is_empty or g.geom_type != "Polygon": continue
        out.append([[round(x, 2) for xy in g.exterior.coords for x in xy]] + [[round(x, 2) for xy in h.coords for x in xy] for h in g.interiors])
    return out
render = {"domain": rings(domain), "asphalt": rings(asphalt), "paint": rings(paint), "gravel": rings(gravel),
          "note": "flat [x0,y0,x1,y1,...] rings; first ring outer, rest holes. Local metres, same frame as track.json"}
json.dump(render, open("data/tracks/barcelona/render.json", "w"), separators=(",", ":"))
for k in ("domain", "asphalt", "paint", "gravel"): print(k, len(render[k]), "polys", round(sum(Polygon(np.reshape(r[0], (-1, 2))).area for r in render[k])), "m2")
