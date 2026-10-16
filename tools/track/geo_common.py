"""Hàm dùng chung cho pipeline dựng đường đua Barcelona (hệ toạ độ UTM 31N, mét)."""
import json, math, numpy as np
from PIL import Image
from pyproj import Transformer
from scipy.interpolate import splprep, splev
Image.MAX_IMAGE_PIXELS = None
ROOT = "."
def load_osm():
    d = json.load(open(f"{ROOT}/data/osm/catalunya_raw.json", encoding="utf8"))
    tr = Transformer.from_crs("EPSG:4326", "EPSG:25831", always_xy=True)
    N = {e["id"]: tr.transform(e["lon"], e["lat"]) for e in d["elements"] if e["type"] == "node"}
    W = {e["id"]: e for e in d["elements"] if e["type"] == "way"}
    return N, W
def way_pts(N, W, ids):
    p = []
    for i in ids:
        q = [N[n] for n in W[i]["nodes"]]; p += q if not p else q[1:]
    return np.array(p)
def resample_closed(P, step=1.0, smooth=0.0):
    """Closed spline through P, resampled every `step` metres. Returns points, tangents, normals (left), s."""
    P = P[:-1] if np.allclose(P[0], P[-1]) else P
    tck, _ = splprep([P[:, 0], P[:, 1]], s=smooth * len(P), per=1)
    u = np.linspace(0, 1, 20000, endpoint=False); x, y = splev(u, tck)
    seg = np.hypot(np.diff(x, append=x[0]), np.diff(y, append=y[0])); cum = np.concatenate([[0], np.cumsum(seg)])
    L = cum[-1]; n = int(round(L / step)); s = np.arange(n) * L / n
    uu = np.interp(s, cum, np.append(u, 1.0)); x, y = splev(uu, tck); dx, dy = splev(uu, tck, der=1)
    t = np.stack([dx, dy], 1); t /= np.linalg.norm(t, axis=1)[:, None]
    nrm = np.stack([-t[:, 1], t[:, 0]], 1)
    return np.stack([x, y], 1), t, nrm, s, L
class Ortho:
    def __init__(self):
        m = json.load(open(f"{ROOT}/data/imagery/catalunya_ortho_25cm.json")); self.m = m
        self.img = np.asarray(Image.open(f"{ROOT}/data/imagery/catalunya_ortho_25cm.jpg")).astype(np.float32) / 255
        self.x0, self.y1, self.r = m["x0"], m["y1"], m["res_m"]
    def sample(self, XY):
        """Nearest-pixel RGB at world points, shape (...,2) -> (...,3)."""
        c = np.clip(((XY[..., 0] - self.x0) / self.r).astype(int), 0, self.img.shape[1] - 1)
        r = np.clip(((self.y1 - XY[..., 1]) / self.r).astype(int), 0, self.img.shape[0] - 1)
        return self.img[r, c]
def hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, d / (mx + 1e-6), mx
# Pixel classes
C_GREY, C_WHITE, C_RED, C_GREENPAINT, C_GRASS, C_BEIGE, C_DARK, C_OTHER = range(8)
def classify(rgb):
    h, s, v = hsv(rgb); c = np.full(h.shape, C_OTHER, np.uint8)
    c[(s < 0.16) & (v > 0.30) & (v <= 0.84)] = C_GREY
    c[(v > 0.84) & (s < 0.16)] = C_WHITE
    c[((h < 20) | (h > 335)) & (s > 0.33) & (v > 0.40)] = C_RED
    c[(h > 95) & (h < 175) & (s > 0.28) & (v > 0.55)] = C_GREENPAINT
    c[(h > 45) & (h < 110) & (s > 0.18) & (v <= 0.62)] = C_GRASS
    c[(h >= 20) & (h <= 50) & (s >= 0.16) & (s < 0.45) & (v > 0.55)] = C_BEIGE
    c[v < 0.30] = C_DARK
    return c
