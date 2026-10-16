"""Căn dữ liệu vị trí OpenF1 (dm, hệ toạ độ F1) về hệ UTM 31N của OSM bằng ICP, và chọn vòng OSM khớp nhất."""
import json, math, numpy as np
from scipy.spatial import cKDTree
exec(open("tools/track/loops.py", encoding="utf8").read().split("start = 831804327")[0])
def loop_pts(ids):
    p = []
    for i in ids:
        q = [N[n] for n in race[i]["nodes"]]; p += q if not p else q[1:]
    return np.array(p)
def densify(p, step=2.0):
    out = []
    for a, b in zip(p, p[1:]):
        n = max(1, int(math.dist(a, b) / step)); out += [a + (b - a) * k / n for k in range(n)]
    return np.array(out)
f = json.load(open("data/openf1/s11303_fastest_laps.json"))
T = np.vstack([np.array([[q["x"], q["y"]] for q in v["loc"]]) * 0.1 for v in f.values()])
def icp(src, dst, R, t, it=60):
    kd = cKDTree(dst)
    for _ in range(it):
        s = src @ R.T + t; d, j = kd.query(s); m = d < np.percentile(d, 90)
        a, b = src[m], dst[j[m]]; ca, cb = a.mean(0), b.mean(0)
        U, S, Vt = np.linalg.svd((a - ca).T @ (b - cb)); D = np.diag([1, np.sign(np.linalg.det(Vt.T @ U.T))])
        R = Vt.T @ D @ U.T; t = cb - ca @ R.T
    d, _ = kd.query(src @ R.T + t); return R, t, d
cands = {"A_4662": [831804327,1560896065,1560896066,1560896061,893732520,831804325,990483278],
         "B_4678": [831804327,1560896065,1560896066,1560896061,1560896063,1560896062,1560896068,1560896067]}
best = None
for name, ids in cands.items():
    P = densify(loop_pts(ids))
    for flip in (1, -1):
        S = T * [1, flip]
        for ang in range(0, 360, 10):
            a = math.radians(ang); R = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
            t = P.mean(0) - S.mean(0) @ R.T
            R2, t2, d = icp(S, P, R, t)
            sc = np.median(d)
            if best is None or sc < best[0]: best = (sc, name, flip, R2, t2, d)
    print(name, "best so far", round(best[0], 2), best[1])
sc, name, flip, R, t, d = best
print("WINNER", name, "flip", flip, "median dist m", round(np.median(d), 2), "p90", round(np.percentile(d, 90), 2), "max", round(d.max(), 1), "rot deg", round(math.degrees(math.atan2(R[1,0], R[0,0])), 2))
json.dump({"loop": cands[name], "flip_y": flip, "R": R.tolist(), "t": t.tolist(), "scale": 0.1}, open("data/openf1/align_to_utm31n.json", "w"), indent=1)
