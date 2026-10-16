"""So độ rộng đo từ ảnh với TUM racetrack-database (đo từ ảnh vệ tinh, layout trước 2023). Căn TUM bằng ICP."""
import numpy as np, sys
from scipy.spatial import cKDTree
z = np.load("data/tracks/barcelona/centreline.npz"); P = z["P"]
T = np.loadtxt("data/geometry/dl_tum/Catalunya.csv", delimiter=",", comments="#")
X = T[:, :2]; wr_t, wl_t = T[:, 2], T[:, 3]
kd = cKDTree(P); best = None
for ang in range(0, 360, 5):
    a = np.radians(ang); R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]]); t = P.mean(0) - X.mean(0) @ R.T
    for _ in range(40):
        Y = X @ R.T + t; d, j = kd.query(Y); m = d < np.percentile(d, 80); A_, B_ = X[m], P[j[m]]
        ca, cb = A_.mean(0), B_.mean(0); U, S, Vt = np.linalg.svd((A_ - ca).T @ (B_ - cb)); R = Vt.T @ np.diag([1, np.sign(np.linalg.det(Vt.T @ U.T))]) @ U.T; t = cb - ca @ R.T
    d, j = kd.query(X @ R.T + t)
    if best is None or np.median(d) < best[0]: best = (np.median(d), R, t, d, j)
md, R, t, d, j = best; print("TUM->ours median %.2f m" % md)
tw = np.full(len(P), np.nan); 
for k in range(len(X)):
    if d[k] < 3: tw[j[k]] = wr_t[k] + wl_t[k]
ow = z["wl"] + z["wr"]
for a in range(0, len(P), 100):
    seg = slice(a, a + 100); print(a, "ours %.1f" % np.median(ow[seg]), "tum %.1f" % np.nanmedian(tw[seg]) if np.isfinite(tw[seg]).any() else "tum -")
