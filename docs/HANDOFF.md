# Bàn giao V11, sang V12

Trạng thái ngày 16/10/2026. Tất cả số dưới đây đo bằng harness headless (Node vm, 60 Hz,
`Math.random` thay bằng mulberry32 theo seed), trừ khi ghi khác.

## 1. Mục tiêu đã chốt với người dùng

- Barcelona hoàn hảo trước, rồi mới nhân ra Monza và Imola.
- Phân hạng:
  - Xe ngoài 4 đội top lọt top 6 là chuyện hiếm (không phải 20–30%).
  - Pole tới P10 trong Q3 thường dưới khoảng 1 s. Hơn 1 s là mốc rớt xuống Q2.
  - Mercedes, Ferrari không thể out Q1 nếu không có tai nạn hay hỏng xe. Ferrari có xác suất nhỏ
    khoảng 1% tính sai chiến thuật.
  - Phân hạng không được thành màn so xe thuần túy. Phải có biến số: set-up, traffic, khả năng
    tính traffic của đội.
  - Khoảng cách giữa các xe không quá sát so với thực tế, để một pha lock-up 0.1 s không làm tụt
    quá sâu.
- Race:
  - Pole nhanh hơn vòng nhanh nhất race khoảng 3–4 s.
  - Cuộc đua thú vị, nhiều tình huống cạnh tranh.
- Aston Martin chậm hơn top khoảng 2.5–2.8 s (ngoài đời khoảng 3.1 s). Người dùng đã đồng ý mặc
  định, nhưng chưa áp dụng vào code.
- Pit lane khoảng 368 m, nhìn thuận mắt trước, đúng từng mét sau. Xe nghỉ nằm trong garage, mũi
  xe hướng ra pit lane, vuông góc.

## 2. Hình học Barcelona (V11)

- Ghép từ hai nguồn:
  - TU Munich racetrack-database `Catalunya.csv` (giấy phép LGPL-3.0, layout trước 2023 có
    chicane).
  - bacinger/f1-circuits `es-1991.geojson` (giấy phép MIT, layout hiện tại).
- Căn khớp hai nguồn bằng grid search, sai số trung bình khoảng 4 m, rồi làm mượt Gaussian.
- Kết quả: 466 waypoint, cách nhau 10 m. Tỉ lệ 1 unit = 1.413 m. Chiều dài 4649 m.
- Script và dữ liệu nằm ở `data/geometry/` (`splice*.py`, `geo_build.py`, các file JSON,
  `dl_tum`, `dl_geo`).
- Vạch:
  - `sectorS` [0.333, 0.716], `interm1S` 0.326, `interm2S` 0.708, `speedTrapS` 0.14.
  - `pitEntryS` 0.951, `pitExitS` 0.124, `pitExitHoldS` 0.176 (xe ra pit giữ làn trong tới T1).
  - Overtake Mode: `momDetectS` 0.888 (giữa T13 và T14), `momActivateS` 0.951.
  - `xModeZones`: [0.951,1.0], [0,0.152], [0.301,0.335], [0.473,0.531], [0.643,0.721].
  - `tvCorners`: 01, 10, 14, 05, 04.
- Run-off T1 và T10 được nới (asphalt, depth 24 và 22). Đây là ước lượng theo bố cục, không phải
  số đo.

## 3. Hiệu chỉnh tốc độ (A2, đã xong)

- PHYS: `latMech` 1.97, `latAero` 2.42.
- MGU-K theo Formula1.com:
  - Bình thường: 350 kW tới 290 km/h, giảm dần về 0 ở 355 km/h.
  - Override: 350 kW tới 337 km/h, giảm về 0 ở 355 km/h.
  - Các nguồn khác ghi khác (F1 Briefing: 280→340, The Race: từ 340). Đã chọn trang chính thức.
- Xả pin trong phân hạng dùng bản đồ đo từ chạy thử:
  - Một xe tham chiếu thử 6 ngưỡng xả: 240, 255, 270, 285, 300, 315 km/h. Giữ ngưỡng cho vòng
    nhanh nhất; Barcelona chọn 270.
  - Lượng pin theo vòng (50 điểm, đã tính năng lượng thu khi phanh) là mốc để bám, hệ số 400.
  - Trên đường thẳng dài nhất xả hết công suất luật cho phép.
  - Kết quả lưu ở `QUALI_PRACTICE_CACHE["dm_"+track]`.
- Một xe, điều kiện Q1, setup 0.97 (`qcal5.js`):

  | | Giả lập | FIA 2026 |
  |---|---|---|
  | Lap | 75.52 s | |
  | S1 / S2 / S3 | 21.52 / 30.58 / 23.42 | 22.15 / 30.44 / 23.05 (quy đổi về Q1) |
  | Vạch đích | 293 | 299–305 |
  | Trap | 336 | 336.5–340.6 |
  | I1 / I2 | 291 / 297 | 285–287 / 294–297 |

  Người dùng chấp nhận phần lệch còn lại.
- Phân hạng đầy đủ (`qdbg.js`, seed 3): pole 1:14.517 (ngoài đời 1:14.679). P10 cách 1.28 s, hơi
  nhiều, thuộc mục B1.

## 4. Race: baseline của bản V11 cuối

Bản cuối có thêm Smart Cam và replay, nhưng hai phần này không đụng vật lý. Đã kiểm: seed 33 cho
kết quả trùng từng số.

| Seed | Xe bỏ cuộc do va chạm hoặc tai nạn | Pha vượt (race2) | Lỡ pit |
|---|---|---|---|
| 32 | 4 | 72 | 0 |
| 33 | 2 | 36 | 0 |
| 34 | 1 | 75 | 0 |

- Trung bình xe bỏ cuộc do va chạm hoặc tai nạn là khoảng 2.3. Bản cũ (hình học cũ) khoảng 1.3.
- Pha vượt thật (`battles.js`, seed 33, 66 vòng) dao động 58–73 qua các bản gần đây. Pha vượt qua
  lại khoảng 6–15. Bản cũ: 63 pha vượt, 17 pha vượt qua lại.
- Pit loss Barcelona: giả lập 22.8 s, ngoài đời 22.2 s. Imola 28.2, Monza 24.1 (cấu hình
  `pitLossSec`).
- A/B Straight Mode và Overtake Mode (seed 33/34): tắt Straight Mode giảm pha vượt khoảng 40% và
  giãn đoàn. Tắt Overtake Mode thì giãn mạnh nhất. Giữ cả hai.
- File kết quả đầy đủ ở `baselines/`. Lưu ý: golden của V12 phải sinh lại từ chính file V11 trong
  project ở giai đoạn 0.

## 5. Những lỗi gốc đã sửa trong V11 (đừng để tái phát)

- **Lỡ lối vào pit** (86–89 lần mỗi race). Lối vào nằm phía trong T14. Xe đã chốt pit giới hạn
  44 m/s trong 200 m cuối. Xe thủng lốp chạy chậm hơn theo căn bậc hai của hệ số bám. Xe đang bị
  văng ra ngoài thì nhân thêm 0.85.
- **Xe ra pit cắt ngang mặt đường trước T1**: thêm `exitHoldS`.
- **Vòng lặp "phanh thẳng"**: phanh ăn hết bám, lái bị bóp, lái ít đi nên lại phanh mạnh hơn.
  Sửa bằng `latPriority`: khi cua đòi trên 70% bám thì ưu tiên lái.
- **Xe tấn công đâm đuôi xe trước**: radar bỏ qua xe trước chỉ dựa vào lệnh lái `cmdLat`. Giờ yêu
  cầu thân xe kịp né (`tClear < 0.8 * tHit`) và kiểm cả vị trí tương lai của xe trước
  (`oLatFuture`).
- **Lỗi do Opus tự gây ra, đã gỡ**: đoạn "nhả ga khi lệch line" so vị trí với line 40 m phía
  trước, làm mọi xe chậm oan 0.9 s/vòng và khiến xe phòng thủ phanh sớm, gây đâm đuôi. Bài học:
  so sánh với line tại chỗ.
- **Phân hạng**:
  - Lốp, MOM và năng lượng trong phân hạng.
  - Line-cost dùng RNG nên pole dao động 1:19.8 đến 1:22.7. Sửa bằng test drive tất định.
  - Abort lap dùng `refSplits`.
  - Nhường đường có hysteresis và alongside latch.
  - Chạy thử dạng ghost theo generator.

## 6. Các hệ thống V11 cần giữ khi tách module

- Line family (STD, V, LATE, U), `LINE_COST_CACHE`, planner `plannedSpeed` (backward pass, friction
  circle).
- Va chạm theo impulse và mức độ (`registerContact`), stewards.
- Pit lane có độ dài thật (`buildPitPath`), double stack, garage.
- SC, VSC, red flag, local yellow.
- Strategy desk phân hạng (`QSTRAT_SIGMA`, `qualiPredictCut`, push–cool–push, tyre sets), chạy thử.
- Timing: sector tím, xanh, vàng; speed trap, I1, I2, vạch đích.
- Overtake Mode theo điểm phát hiện; Straight Mode theo vùng.
- Trạm trọng tài và cờ (`marshalPosts`, `postFlag`).
- Smart Cam (`smartScan`, `smartDirect`, `smartMove`) và replay (`TV`, `tvRecord`, `tvPickReplay`).
  Số đo của Smart Cam ở mục 7.

## 7. Smart Cam và replay

- Đạo diễn:
  - Mỗi cảnh giữ tối thiểu 6 s. Không cắt khi đang "hot" (song song hoặc sắp phanh).
  - Chỉ chuyển khi cảnh mới hơn ×1.45 + 0.15. Cặp vừa quay nghỉ 18 s.
  - Hệ số vị trí là 1.8 − 0.07 × (pos − 1).
- Máy quay:
  - Lò xo giảm chấn trên phần lệch so với mục tiêu. Mọi bước nhảy của vị trí và vận tốc mục tiêu
    được chuyển thành phần lệch.
  - Pan chờ zoom. Tốc độ trượt hình tối đa 1800 px/s.
- Số đo (`smartcam.js`):
  - 3.4–5.4 lần cắt cảnh mỗi phút.
  - Trên 70% pha vượt lọt vào màn chính.
  - Gia tốc hình tối đa khoảng 3–4 nghìn px/s².
- Sự kiện:
  - Lưới xuất phát, xuất phát, SC, VSC, pit top 5, vòng cuối, cờ ca rô.
  - Lúc yên: luân phiên xe dẫn đầu, tay đua nổi tiếng, máy quay đặt ở góc cua biểu tượng.
- Replay:
  - Bộ đệm 30 s ở 30 Hz, đoạn xuất phát lưu riêng khoảng 42 s.
  - Phát: pha vượt top 3, pha vượt top 10 bị màn chính bỏ lỡ, va chạm và tai nạn. Tai nạn lớn phát
    một lần trên màn chính.
  - Khi có SC: chiếu tai nạn trước, rồi các pha vượt top 10 trước đó.
  - Vòng 3: cụm replay xuất phát (tắt đèn, xe lên nhiều nhất, xe mất nhiều nhất).
  - Đoạn quyết định quay chậm 0.5x.
- Bố cục TV khi bật Smart Cam: ẩn HUD dưới và dải timing, thu gọn bảng xếp hạng, thanh trên thu
  nhỏ và mờ.

## 8. Việc còn dở từ danh sách V11

- **A5**: pit lane và garage (xe nằm trong garage, ô pit sơn, khoảng 368 m) và hiệu chỉnh lại pit
  loss.
- **B1**: cấu trúc tốc độ cả field.
  - Midfield sát top hơn. Aston Martin +2.5–2.8 s.
  - Race hiện chênh khoảng 3–4 s/vòng giữa xe nhanh nhất và chậm nhất, nên P9–P10 có lúc bị bắt
    vòng. Ngoài đời thường từ P11–P12 trở xuống mới bị bắt vòng.
- **B2**: xe vòng chậm chạy lệch line có điều kiện, nhường theo trình độ tay đua.
- **B3**: dự báo traffic theo năng lực đội. Đội top ít khi đặt xe vào vị trí bất lợi.
- **B4**: nguồn biến động phân hạng theo năng lực.
- **B5**: bộ đo 30 lần phân hạng, tối đa 2 vòng hiệu chỉnh.
- **C1**: pole và vòng nhanh nhất race chênh 3–4 s.
- **D1**: Monza và Imola với hình học thật. TUM có Monza. Imola không có trong lịch 2026.
- Smart Cam cho phân hạng: theo vòng nhanh, sector tím, xe sát vạch bị loại.
- Để sau: chiến thuật theo điểm đội cộng thưởng thắng, hiện "+1 VÒNG".

## 9. Lịch sử phiên bản trong gói

- `history/v8_argon.html`: bản Argon V8.
- `history/v9_before_core.html`: trước khi viết lại lõi V9.
- `history/v11_old_geometry.html`: V11 với hình học Barcelona cũ (vẽ tay), trước khi đổi sang dữ liệu thật.
