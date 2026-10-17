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

## M1: vật lý (17/10/2026)

Lõi `src/sim/` (TypeScript, không đụng DOM), pipeline và cách kiểm tra ở `tools/physics/README.md`. Trang xem:
`/physics.html` (một xe, tay đua AI hoặc bàn phím, xe "bóng" là vòng thật OpenF1, đồ thị tốc độ, năng lượng,
gia tốc g, tải và mức dùng độ bám từng lốp).

- Xe động lực học 2 trục 4 bánh, 500 bước/giây, tất định (cùng đầu vào cùng kết quả, đã có test). Một vòng mất
  khoảng 0.3 s CPU, tức 22 xe chạy thời gian thực tốn chưa tới 1 % một nhân.
- Luật năng lượng 2026 đúng tài liệu FIA Barcelona: đường cong MGU-K theo tốc độ (đọc từ biểu đồ vector trong PDF;
  phân hạng dùng "Base - Overtake": 350 kW tới 337.5 km/h, về 0 ở 355 km/h), sạc tối đa 7 MJ/vòng phân hạng,
  giảm công suất tối đa 100 kW/s ngoài các cửa sổ cho phép.
- Dữ liệu thật mới: độ cao đường đua (OpenF1 z), tỉ số truyền từng đội (tốc độ/vòng tua), bản đồ MGU-K từng đội suy
  ra từ gia tốc thật (thấy rõ kiểu "super clipping": xả đầu đoạn thẳng, sạc ở cuối).
- Khớp từng đội với vòng nhanh nhất của đội: thời gian vòng khớp tới 0.02 s, sector lệch 0.04–0.6 s (S2 luôn hơi
  nhanh, S1/S3 hơi chậm), sai số tốc độ trung bình 10–16 km/h, tốc độ tối đa lệch dưới 7 km/h. Cả 11 đội chạm biên
  trên của CdA (1.3 m²) và ICE (420 kW): dữ liệu muốn xe cản và mạnh hơn mức công bố hợp lý. Phần lệch lớn nhất: T13/T14 (xe thật nhanh hơn 15–20 km/h, bán kính đo từ cả OSM lẫn
  vị trí OpenF1 đều ~95 m, nghĩa là xe thật chịu ~5.5 g, chưa giải thích được), và các điểm phanh (dữ liệu 3.7 Hz
  làm điểm phanh thật trông sớm hơn).
- Đường đua tối ưu cho mô phỏng (`racing_line_sim`), vì đường thật OpenF1 quá thô để lấy bán kính.

Việc tiếp theo (M2 gộp vào M1 một phần vì đã khớp từng đội): tay đua AI if-else (M3) dựng trên `driver.ts`
(thêm tranh chấp, phòng thủ, vượt, sai lầm theo kỹ năng).
