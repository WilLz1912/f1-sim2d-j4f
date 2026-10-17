# Vật lý (M1): dữ liệu, khớp xe, kiểm tra

Lõi vật lý nằm ở `src/sim/` (TypeScript, không đụng DOM, chạy được cả trong trình duyệt lẫn Node):

| File | Nội dung |
|---|---|
| `track.ts` | Đường đua cho vật lý: tâm đường, đường đua mô phỏng, độ cao, độ dốc, độ cong đứng, vùng Straight Mode, cửa sổ giảm công suất FIA, bản đồ mặt đất 0.5 m (độ bám/ma sát lăn của kerb, cỏ, sỏi; rào chắn = va chạm) |
| `car.ts` | Thông số xe: từ `cars_2026.json` (khối lượng, trục cơ sở, track), `gearing_2026.json` (tỉ số truyền đo từ telemetry), `physics_2026.json` (giá trị khớp với vòng thật); đường cong MGU-K của FIA |
| `vehicle.ts` | Mô hình xe 2 trục 4 bánh, bước cố định 1/500 s: tải từng bánh (trọng lượng trên dốc, khí động, chuyển tải dọc/ngang), lốp (đường cong lực ngang, nhạy tải, elip ma sát, trượt bánh), hộp số 8 cấp, ICE + MGU-K + pin, luật FIA (giới hạn 350 kW theo tốc độ, sạc tối đa 7 MJ/vòng phân hạng, giảm công suất tối đa 100 kW/s ngoài cửa sổ cho phép), Straight Mode |
| `qss.ts` | "Kế hoạch" tốc độ dạng điểm khối lượng (quasi-steady-state) trên đường đua, dùng cùng mô hình tải và lốp; kèm bản đồ năng lượng và mức pin dự kiến |
| `driver.ts` | Tay đua AI của phòng thí nghiệm: bám đường đua, bám tốc độ kế hoạch, cảm giác độ bám (không spin bánh, không khoá bánh), bắt trượt đuôi. Nền cho tay đua if-else ở M3 |
| `lap.ts` | Chạy một vòng bay không giao diện (Node) |

## Pipeline

1. `python tools/physics/build_reference.py` — từ 22 vòng nhanh nhất phân hạng Barcelona 2026 (OpenF1):
   `data/telemetry/barcelona_2026_q.json` (tốc độ, ga, phanh, số, vòng tua theo quãng đường, mỗi 5 m),
   độ cao `stations.z` (trung vị toạ độ z, chênh 29.8 m, lệch giữa các vòng 0.1 m), tỉ số truyền từng đội
   `data/cars/gearing_2026.json`, cửa sổ giảm công suất FIA vào `track.json`.
2. `python tools/physics/build_line.py` — đường đua mô phỏng `racing_line_sim`: đường cong nhỏ nhất trong bề rộng
   mặt đường đo trên ảnh, kéo nhẹ về đường thật OpenF1 (lệch trung vị 0.4 m). Đường thật 3.7 Hz quá thô để lấy
   bán kính cua.
3. `npx vite-node tools/physics/fit.ts [đội ...]` — khớp xe từng đội với vòng nhanh nhất của đội (xe động lực học +
   tay đua AI 100 %): độ bám lốp, độ nhạy tải, hệ số bám dọc, lực ép, lực cản, công suất ICE. Bản đồ MGU-K của đội
   suy ra trực tiếp từ gia tốc thật (`energy-map.ts`); luật năng lượng FIA là ràng buộc của bài khớp. Ghi
   `data/cars/physics_2026.json`.

Kiểm tra: `npx vite-node tools/physics/lap.ts [đội] [mã tay đua]` (một vòng, so từng đoạn), `cmp.ts` (kế hoạch QSS
so với vòng thật), `npm test` (tất định, luật năng lượng, tốc độ tối đa, quãng phanh, khớp vòng Mercedes).
Xem trực quan: `npm run dev`, mở `/physics.html`.

## Những gì là ước lượng (không có nguồn công khai)

- Đường cong lốp (góc trượt đỉnh 5°, giảm 8 % sau đỉnh), hệ số ma sát lăn, độ bám của cỏ/sỏi/kerb.
- Chiều cao trọng tâm 0.28 m, phân bố trọng lượng 45 % trước, mô men quán tính, phân bố độ cứng chống lật 58 % trước,
  cân bằng khí động bằng phân bố trọng lượng, cân bằng phanh 57 %, nhiên liệu khi phân hạng 8 kg, mật độ không khí.
- Lực cản ở Straight Mode = 0.55 × lực cản thường: tốc độ đơn thuần không tách được lực cản khỏi việc "clip" năng
  lượng, nên buộc theo công bố FIA (giảm 55 % lực cản so với 2025).
- Pin dùng được 4 MJ (theo V11).
- Giới hạn khớp theo số công bố: CdA 0.8–1.3 m², ClA 2.5–6 m², ICE 330–420 kW. Mercedes chạm biên trên của CdA và
  ICE: dữ liệu muốn xe cản nhiều hơn và mạnh hơn mức hợp lý, phần dư bị hấp thụ vào các thông số khác.
