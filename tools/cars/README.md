# Pipeline dữ liệu xe (Python)

1. `python tools/cars/car_targets.py` — dấu vân tay phân hạng Barcelona 2026 (OpenF1) của từng xe.
2. `python tools/cars/build_cars.py` — `data/cars/cars_2026.json`: luật 2026, thông số đội công bố, đội hình,
   T-cam, mũ bảo hiểm, livery khởi điểm.
3. `python tools/cars/measure_livery.py` — đo màu livery từ ảnh đua thật 2026 (Wikimedia Commons), ghi đè màu.

Xem: `npm run dev` rồi mở `/cars.html`. Hình vẽ ở `src/render/car.ts` (mỗi đội một hàm tô livery).
