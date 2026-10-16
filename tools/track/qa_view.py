"""Ảnh kiểm tra: vẽ mép đường (xanh lơ), kerb (tím), vạch (vàng) lên ảnh trực giao tại các vị trí s cho trước.
python tools/track/qa_view.py out.jpg s1 s2 ...   (mỗi ô 160 m x 160 m)"""
import numpy as np, sys, json
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None
z = np.load("data/tracks/barcelona/centreline.npz"); P, Nl = z["P"], z["Nl"]
im = Image.open("data/imagery/catalunya_ortho_25cm.jpg"); x0, y1, r = 437400, 4603400, 0.25
f = lambda p: ((p[0] - x0) / r, (y1 - p[1]) / r)
extra = json.load(open(sys.argv[2])) if sys.argv[2].endswith(".json") else None
ss = [int(a) for a in sys.argv[2 + (extra is not None):]]
tiles = []
for k in ss:
    c = f(P[k % len(P)]); box = (int(c[0] - 320), int(c[1] - 320), int(c[0] + 320), int(c[1] + 320))
    cr = im.crop(box); d = ImageDraw.Draw(cr); g = lambda p: (f(p)[0] - box[0], f(p)[1] - box[1])
    for sign, w, kk in ((1, z["wl"], z["kl"]), (-1, z["wr"], z["kr"])):
        E = P + sign * Nl * w[:, None]; K = P + sign * Nl * (w + z[kk.__class__ and ("kl" if sign > 0 else "kr")])[:, None]
        d.line([g(e) for e in E], fill=(0, 255, 255), width=1)
        on = z["kl" if sign > 0 else "kr"] > 0
        for i in np.where(on)[0]:
            d.line([g(E[i]), g(K[i])], fill=(255, 0, 255), width=1)
    for name in ("sector1", "sector2", "i1", "i2", "st"):
        i = int(z[name]); a, b = P[i] + Nl[i] * 9, P[i] - Nl[i] * 9; d.line([g(a), g(b)], fill=(255, 255, 0), width=2); d.text(g(a), name, fill=(255, 255, 0))
    a, b = P[0] + Nl[0] * 9, P[0] - Nl[0] * 9; d.line([g(a), g(b)], fill=(255, 255, 255), width=3)
    d.text((5, 5), f"s={k}", fill=(255, 255, 0)); tiles.append(cr.resize((400, 400)))
cols = 4; rows = (len(tiles) + cols - 1) // cols
out = Image.new("RGB", (400 * cols, 400 * rows))
for i, t in enumerate(tiles): out.paste(t, (400 * (i % cols), 400 * (i // cols)))
out.save(sys.argv[1], quality=85)
