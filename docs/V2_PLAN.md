# Bản 2.0: dựng lại từ gốc

Quyết định của người dùng ngày 17/10/2026: không tách V11 nữa mà dựng lại toàn bộ trên vật lý thật.
V11 giữ nguyên làm demo (tag git `v11-final`). Thứ tự: **đường đua → xe → tay đua AI (if-else) → đua → đội 12
(tay đua là mô hình AI train bằng Python)**. Lộ trình cũ "giai đoạn 1–4" trong CLAUDE.md không còn áp dụng; các
nguyên tắc (tất định, lõi không đụng DOM, đo trước/sau, trung thực về số liệu) vẫn giữ.

Công nghệ: TypeScript + Canvas/WebGL trong trình duyệt cho game; Python cho pipeline dữ liệu (đường đua, xe,
phân tích). Người dùng chỉ đọc Python/SQL, nên thông số đặt trong JSON có ghi nguồn.

## Đã xong

- **Đường đua Barcelona 2026** (`data/tracks/barcelona/`, pipeline `tools/track/`, xem `track.html`):
  tâm đường OSM khớp vết chạy thật OpenF1 (lệch trung vị 1.8 m), mép và kerb đo trên ảnh ICGC 25 cm
  (độ rộng khớp TUM trong ~1 m), vạch đích/sector/speed trap từ OpenF1, vạch Overtake và pit 368 m từ FIA,
  bản đồ mặt đất 0.5 m, rào chắn ước tính, lưới 22 ô, 11 ô pit.
- **Xe 2026** (`data/cars/cars_2026.json`, `tools/cars/`): luật chung, thông số đội công bố (khối lượng, trục
  cơ sở, chiều dài Mercedes/Audi, kiểu treo, PU, hộp số), livery Argon, đội hình 2026, và "dấu vân tay" hiệu năng
  thật ở phân hạng Barcelona 2026 (lap, sector, speed trap, tốc độ min ở các góc) làm mục tiêu hiệu chỉnh.

## Cập nhật đêm 17/10 (làm tự động theo yêu cầu người dùng)

- Đồ hoạ game: `src/render/track.ts` vẽ vector theo bảng màu V11 (Argon/Opus) trên hình học thật. `surface.png`
  chỉ dành cho vật lý, xem đối chiếu bằng nút trong `track.html`.
- Thứ tự garage theo bản vẽ pit lane FIA 2026; vạch xuất phát cách vạch đích 126 m (FIA); pit lane đo lại trên ảnh
  (tường -3 m, làn nhanh 5 m, làn làm việc 6.5 m, garage từ +9 m so với đường tâm pit OSM).
- Xe: livery 2026 theo mô tả báo chí, cả hai mặt Cadillac; mũ bảo hiểm 3 màu từng tay đua; T-cam đen/vàng theo
  spotter's guide 2026; số xe. Trang `cars.html`.
- Đã thử khớp downforce/lực cản từng đội bằng mô hình tĩnh từ tốc độ min ở góc: kết quả vô lý (ClA ~12 m2), vì
  góc nhanh không ở giới hạn bám. Đã bỏ. Khớp thật phải dùng mô phỏng cả vòng ở M2.

## Chưa chắc / ước tính (cần dữ liệu tốt hơn)

- Tháp Race Control: vị trí ước tính (đầu pit building phía lối ra).
- Màu livery/mũ là xấp xỉ từ mô tả chữ, không phải mã màu chính thức.

- Vạch đích: theo OpenF1 nằm giữa lưới (ô 12–13). Có thể lệch do độ trễ dữ liệu vị trí.
- Vùng Straight Mode: FIA nêu tên 4 vùng, khoảng cách là ước tính.
- Rào chắn: dò từ ảnh, chỗ góc trong còn vòng lạ.
- Thứ tự garage các đội, bề rộng làn pit.
- Phần lớn kích thước xe không được công bố (wheelbase để 3400, dài 5480); khí động và trọng tâm là ước tính,
  sẽ khớp theo dữ liệu thật ở M2.
- Chú ý: F1 Live Timing (FastF1) đã khoá (401) từ 2026; dùng OpenF1.
