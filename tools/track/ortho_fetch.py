"""Tải ảnh trực giao ICGC (Institut Cartogràfic i Geològic de Catalunya, CC BY 4.0) 25 cm quanh đường đua,
ghép thành một ảnh lớn trong hệ UTM 31N. Ảnh không đưa vào git (tải lại bằng script này)."""
import json, math, os, io, urllib.request, numpy as np
from PIL import Image
exec(open("tools/track/loops.py", encoding="utf8").read().split("start = 831804327")[0])
A = json.load(open("data/openf1/align_to_utm31n.json"))
P = np.array([N[n] for i in A["loop"] for n in race[i]["nodes"]])
pit = [33742214, 178416729, 178416733]
P = np.vstack([P] + [np.array([N[n] for n in W[i]["nodes"]]) for i in pit])
x0, y0 = np.floor(P.min(0) / 100) * 100 - 200; x1, y1 = np.ceil(P.max(0) / 100) * 100 + 200
RES, TILE = 0.25, 500
LAYER = os.environ.get("ORTHO_LAYER", "ortofoto_25cm_color_2025")
os.makedirs("data/imagery", exist_ok=True)
nx, ny = math.ceil((x1 - x0) / TILE), math.ceil((y1 - y0) / TILE)
big = Image.new("RGB", (nx * int(TILE / RES), ny * int(TILE / RES)))
for ix in range(nx):
    for iy in range(ny):
        bx, by = x0 + ix * TILE, y0 + iy * TILE; px = int(TILE / RES)
        url = ("https://geoserveis.icgc.cat/servei/catalunya/orto-territorial/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
               f"&LAYERS={LAYER}&STYLES=&CRS=EPSG:25831&BBOX={bx},{by},{bx+TILE},{by+TILE}&WIDTH={px}&HEIGHT={px}&FORMAT=image/jpeg")
        img = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=120).read())).convert("RGB")
        big.paste(img, (ix * px, (ny - 1 - iy) * px))
        print(ix, iy, img.size, flush=True)
big.save("data/imagery/catalunya_ortho_25cm.jpg", quality=92)
json.dump({"layer": LAYER, "res_m": RES, "x0": x0, "y0": y0, "x1": x0 + nx * TILE, "y1": y0 + ny * TILE, "crs": "EPSG:25831",
           "source": "ICGC orto-territorial WMS", "license": "CC BY 4.0, Institut Cartogràfic i Geològic de Catalunya"},
          open("data/imagery/catalunya_ortho_25cm.json", "w"), indent=1)
