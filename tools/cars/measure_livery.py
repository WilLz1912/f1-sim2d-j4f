"""Đo màu livery từ ảnh đua thật 2026 (Wikimedia Commons, FIA F1 Austria 2026, ảnh trên trang Wikipedia của xe).

Với mỗi xe: lấy vùng giữa ảnh (thân xe), gom 10 nhóm màu (k-means trong không gian Lab), rồi thay mỗi màu livery
trong cars_2026.json bằng tâm nhóm gần nhất nếu đủ gần (Delta E < 25). Ảnh tải về data/cars/photos/ (không vào git).
"""
import json, os, urllib.request, urllib.parse, numpy as np
from PIL import Image
from scipy.cluster.vq import kmeans2
UA = {"User-Agent": "f1-sim-research/1.0"}
PAGES = {"mclaren": "McLaren MCL40", "mercedes": "Mercedes W17", "redbull": "Red Bull Racing RB22", "ferrari": "Ferrari SF-26",
         "williams": "Williams FW48", "vcarb": "Racing Bulls VCARB 03", "aston": "Aston Martin AMR26", "haas": "Haas VF-26",
         "audi": "Audi R26", "alpine": "Alpine A526", "cadillac": "Cadillac MAC-26"}
os.makedirs("data/cars/photos", exist_ok=True)
def srgb_to_lab(rgb):
    c = rgb / 255.0; c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]); xyz = c @ M.T / [0.95047, 1.0, 1.08883]
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
cars = json.load(open("data/cars/cars_2026.json", encoding="utf8")); report = {}
for key, page in PAGES.items():
    fn = f"data/cars/photos/{key}.jpg"
    if not os.path.exists(fn):
        q = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "titles": page, "prop": "pageimages", "piprop": "thumbnail|name", "pithumbsize": 960, "format": "json"})
        pg = list(json.load(urllib.request.urlopen(urllib.request.Request(q, headers=UA), timeout=60))["query"]["pages"].values())[0]
        open(fn, "wb").write(urllib.request.urlopen(urllib.request.Request(pg["thumbnail"]["source"], headers=UA), timeout=60).read())
    im = np.asarray(Image.open(fn).convert("RGB")).astype(float); H, W_ = im.shape[:2]
    crop = im[int(H * 0.22):int(H * 0.72), int(W_ * 0.06):int(W_ * 0.94)].reshape(-1, 3)
    lab = srgb_to_lab(crop); np.random.seed(0)
    cent, lbl = kmeans2(lab[::5], 10, seed=0, minit="++"); share = np.bincount(lbl, minlength=10) / len(lbl)
    rgb_c = np.array([crop[::5][lbl == k].mean(0) if (lbl == k).any() else [0, 0, 0] for k in range(10)])
    liv = cars["teams"][key]["livery"]; changes = {}
    for f in ("primary", "secondary", "tertiary", "wing", "accent"):
        if f not in liv: continue
        d = np.linalg.norm(cent - srgb_to_lab(hexrgb(liv[f])[None])[0], axis=1); k = int(np.argmin(d))
        if d[k] < 25 and share[k] > 0.01:
            new = "#%02X%02X%02X" % tuple(int(v) for v in rgb_c[k]); changes[f] = (liv[f], new, round(float(d[k]), 1)); liv[f] = new
    liv["src"] = "colours measured from 2026 race photo (Wikimedia Commons, FIA F1 Austria 2026; k-means, nearest cluster)"
    report[key] = changes
json.dump(cars, open("data/cars/cars_2026.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
for k, v in report.items(): print(k, v)
