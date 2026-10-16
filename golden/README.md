# Golden V11

Sinh từ `v11/opus_argon_f1_2026_simulator_v11.html` bằng `npm run golden` ngày 16/10/2026.
Kiểm lại: `npm run golden:check`. Chạy một phần: `node tools/golden.mjs --check --only race_s33,quali_s3`.

| Job | Harness | Kết quả chính |
|---|---|---|
| `race_s32/33/34` | `race2.js` | Trùng từng số với `baselines/g12_r32/33/34.out` |
| `quali_s3` | `qdbg.js` | Trùng `baselines/qdbg12.out`. Pole RUS 1:14.517 |
| `battles_s33` | `battles.js`, 66 vòng | 42 pha vượt thật, 10 pha vượt qua lại |
| `qcal5` | `qcal5.js` | Lap 75.517, S1/S2/S3 21.52/30.58/23.42, trap 336 |
| `pitloss` | `pitloss.js` | LOSS 25.92 s |

**Golden ghim Node 22.** Node 18, 20, 22 cho kết quả giống hệt nhau. Node 24 cho race và phân hạng
khác hẳn, dù chạy lại vẫn tất định: V8 mới tính một số hàm `Math` khác ở vài bit cuối, và race là
hệ hỗn loạn nên sai lệch nhỏ lớn dần. `tools/golden.mjs` tự gọi Node 22 qua `npx` nếu máy dùng bản
khác. Hệ quả cho V12: trình duyệt cũng khác nhau như vậy, nên "cùng seed cùng kết quả trên mọi máy"
cần lõi `sim/` tránh phụ thuộc vào các hàm `Math` siêu việt của engine (xem giai đoạn 2).
