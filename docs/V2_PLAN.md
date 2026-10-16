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

## Nguồn của từng thành phần (18/10, sau khi rà soát)

| Thành phần | Nguồn |
|---|---|
| Tâm đường | OSM, khớp 22 vòng thật OpenF1 (lệch trung vị 1.8 m) |
| Mép đường | Ảnh ICGC 25 cm; đoạn ô xuất phát và dưới cầu (cầu theo OSM) nội suy; kiểm chéo TUM (sai ±1 m) |
| Kerb | Ảnh ICGC (dải sọc đỏ trắng), mỗi kerb một độ rộng |
| Run-off, sỏi, cỏ, cây | Ảnh ICGC + OSM (sỏi, toà nhà); chỉ giữ nhựa/sơn nối với mép đường |
| Rào chắn | Biên của vùng đất trống nối với mặt đường (giới hạn bởi cây, công trình, tường), làm mượt 6 m |
| Góc cua, phân đoạn marshal, đèn cờ, pit loss | Dữ liệu mạch đua của hệ thống tính giờ F1 (MultiViewer API) |
| Vạch đích, sector, speed trap, I1, I2 | OpenF1 (thời gian sector và tốc độ của 22 vòng) |
| Vạch xuất phát | FIA (cách vạch đích 126 m) + ảnh |
| Overtake detection/activation, pit 368 m | FIA (Power Unit Information, Race Director notes) |
| Vùng Straight Mode | FIA (tên vùng) + OpenF1 (đoạn cả 22 xe đạp hết ga) |
| Racing line | OpenF1 (trung vị 22 vòng) |
| Pit lane, garage | OSM (đường), ảnh (tường, làn, mặt garage), FIA (thứ tự garage) |
| Xe: khối lượng, trục, dài | Đội công bố; đội không công bố thì lấy theo các đội có công bố (ghi rõ trong file) |
| Livery | Đo màu từ ảnh đua thật 2026 (Wikimedia Commons) |
| T-cam | Motorsport.com spotter's guide 2026 |
| Mũ bảo hiểm | Mô tả thiết kế 2026 (Total Motorsport) |

Còn lại chưa có nguồn: kích thước chi tiết khí động và trọng tâm của từng xe (khớp ở bước vật lý từ dữ liệu
thật), vị trí tháp Race Control (đã bỏ khỏi bản đồ).
