"""Bước 2 vật lý: đường đua tối ưu cho xe mô phỏng (racing_line_sim trong track.json).

Đường đi thật (OpenF1, trung vị 22 vòng) chỉ có vị trí ~3.7 Hz, nên bán kính cua bị đánh giá thấp: T13/T14 ra
~95 m, nghĩa là xe thật ôm 5.4 g ở 255 km/h, không khả thi. Ở đây giải đường cong nhỏ nhất (minimum curvature,
cách làm chuẩn của TUM global race trajectory) trong giới hạn bề rộng mặt đường đo trên ảnh, cộng một lực kéo nhẹ
về đường thật. Bài toán tuyến tính: điểm P_i = C_i + a_i N_i, cực tiểu tổng |P_{i-1} - 2P_i + P_{i+1}|^2
+ lam * (a_i - a_real_i)^2, với a_i trong [-phải, trái]. Lấy mẫu mỗi 3 m, nội suy về 1 m.
"""
import json, numpy as np
from scipy.optimize import lsq_linear
from scipy.sparse import lil_matrix, vstack, identity
from scipy.ndimage import gaussian_filter1d

T = json.load(open("data/tracks/barcelona/track.json")); st = T["stations"]
x, y = np.array(st["x"]), np.array(st["y"]); n = len(x); ds = st["ds"]
tx, ty = np.roll(x, -1) - np.roll(x, 1), np.roll(y, -1) - np.roll(y, 1); l = np.hypot(tx, ty); nx, ny = -ty / l, tx / l
wl, wr = np.array(st["w_left"]), np.array(st["w_right"]); kl, kr = np.array(st["kerb_left"]), np.array(st["kerb_right"])
real = np.array(T["racing_line"]["offset"])
# Car centre limits. Track limits allow the car to straddle the white line while some of it stays inside; drivers do
# that only where a kerb backs it up. Kerb > 0.5 m: centre up to 0.3 m outside the line; elsewhere 0.9 m inside
# (half the 1.9 m car minus a small margin). Estimates of driver behaviour, checked against the real line below.
HALF = 0.95
lim_l = np.where(kl > 0.5, wl + 0.3, wl - HALF + 0.05); lim_r = np.where(kr > 0.5, wr + 0.3, wr - HALF + 0.05)
STEP = 3; idx = np.arange(0, n, STEP); m = len(idx)
C = np.stack([x[idx], y[idx]], 1); N = np.stack([nx[idx], ny[idx]], 1)
LAM = 2e-4
A = lil_matrix((2 * m, m)); b = np.zeros(2 * m)
for i in range(m):
    a, c = (i - 1) % m, (i + 1) % m
    for d in range(2):
        r = 2 * i + d
        A[r, a] += N[a, d]; A[r, i] += -2 * N[i, d]; A[r, c] += N[c, d]
        b[r] = -(C[a, d] - 2 * C[i, d] + C[c, d])
A = vstack([A.tocsr(), np.sqrt(LAM) * identity(m, format="csr")]).tocsr(); b = np.concatenate([b, np.sqrt(LAM) * real[idx]])
res = lsq_linear(A, b, bounds=(-lim_r[idx], lim_l[idx]), lsmr_tol="auto", max_iter=5000, verbose=0)
print("solver:", res.status, res.message)
off = np.interp(np.arange(n), np.concatenate([idx, [n]]), np.concatenate([res.x, [res.x[0]]]))
off = np.clip(gaussian_filter1d(off, 2, mode="wrap"), -lim_r, lim_l)

def radius(o):
    px, py = x + o * nx, y + o * ny
    th = np.unwrap(np.arctan2(np.roll(py, -1) - np.roll(py, 1), np.roll(px, -1) - np.roll(px, 1)))
    k = gaussian_filter1d(np.gradient(th) / np.hypot(np.gradient(px), np.gradient(py)), 5, mode="wrap")
    return 1 / np.maximum(np.abs(k), 1e-5), np.sum(np.hypot(np.diff(px, append=px[0]), np.diff(py, append=py[0])))
Rr, Lr = radius(real); Ro, Lo = radius(off)
for c in T["corners"]:
    j = int(c["apex_s"]); w = np.arange(j - 40, j + 41) % n
    print("T%-2d real-line R %5.0f m   sim-line R %5.0f m   offset diff at apex %4.1f m" % (c["n"], Rr[w].min(), Ro[w].min(), off[j] - real[j]))
print("line length real %.0f m, sim %.0f m; median |diff| %.2f m, 90%% %.2f m" % (Lr, Lo, np.median(np.abs(off - real)), np.percentile(np.abs(off - real), 90)))
T["racing_line_sim"] = {"offset": [round(float(v), 2) for v in off],
    "src": "minimum-curvature line within the measured track width (ortho), weakly pulled to the openf1 median line; "
           "kerb use: car centre up to 0.3 m past the white line where a kerb exists (estimate)"}
json.dump(T, open("data/tracks/barcelona/track.json", "w"), separators=(",", ":"))
