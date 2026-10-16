# Harness đo của V11

Đây là các script Node chạy giả lập không giao diện. Mỗi script đọc phần `<script>` của file HTML
V11 và chạy trong `vm`, với `Math.random` thay bằng mulberry32 theo seed. Cần Node 18 trở lên.
Các script chụp màn hình (`shot*.js`, `prof.js`) cần Playwright và Chromium. Các script này có
đường dẫn cố định `/home/claude/...` và `/opt/...` từ máy làm việc cũ, cần sửa lại trước khi chạy.

Ví dụ: `node race2.js ../../v11/opus_argon_f1_2026_simulator_v11.html barcelona 33 out.json`

## Nhóm chính (dùng làm golden và hồi quy)

| Script | Tham số | Đo gì |
|---|---|---|
| `race2.js` | html track seed out.json [laps] | Cả race: SC/VSC, phạt, va chạm, xe bỏ cuộc, chiến thuật pit, top 10, pha vượt, pace sạch, lỡ pit |
| `battles.js` | html track seed [laps=30] | Từng pha tấn công. "REAL passes" (cả hai xe nguyên vẹn, có pha song song), pha vượt qua lại, line chọn |
| `qdbg.js` | html track seed | Phân hạng Q1–Q3 đầy đủ, in grid và thời gian |
| `qcal5.js` | html track [code] [PHYS json] | Một xe, điều kiện Q1, sau khi chạy thử (có bản đồ xả pin): lap, sector, trap, I1, I2, vạch đích, tốc độ tối thiểu từng góc |
| `qcal.js`, `qcal4.js` | như trên | Giống qcal5 nhưng không chạy thử. qcal4 in thêm năng lượng xả và thu mỗi vòng |
| `pitloss.js` | html track | Thời gian mất do pit (so với không pit) |
| `linetest.js` | html track | Một xe trên từng line (STD, V, LATE, U), kiểm có ra mép đường không |
| `smartcam.js` | html track seed laps | Đạo diễn Smart Cam: số lần cắt cảnh mỗi phút, độ dài cảnh, % pha vượt lọt màn chính, gia tốc hình, khung phụ trùng xe |
| `smartcam_rp.js`, `smartcam_sc.js`, `smartcam_fin.js`, `smartcam_start.js` | như trên | Log replay, SC giả lập, cảnh cuối race, cảnh mở màn |

## Chẩn đoán

| Script | Mục đích |
|---|---|
| `crashdiag.js` html track seed | Lịch sử vị trí trước mỗi lần xe bỏ cuộc, đâm rào, SC |
| `hitdiag.js` html track seed | Như trên, cho các va chạm mạnh |
| `t1trace.js` html track seed CODE tA tB | Bám một xe trong khoảng thời gian race: tốc độ, kế hoạch, lực bám, cờ |
| `solotrace.js` html track CODE sA sB | Một xe chạy một mình, in profile trong đoạn s |
| `pittrace2.js`, `pittrace3.js` | Một xe vào pit hoặc ra pit, in vị trí ngang |
| `lintrace.js` html track seed CODE | Một xe ở lối vào pit trong race |
| `overspd.js` html track seed laps | Sự kiện vượt tốc độ ở đỉnh cua so với xe chạy một mình |
| `runoffspace.js` html track | Khoảng trống thật phía ngoài từng góc, để đặt độ sâu run-off |
| `prof.js` (Playwright) | fps và ms mỗi khung hình: vật lý, vẽ, HUD, ở các chế độ cam |
| `shot*.js` (Playwright) | Chụp màn hình các tình huống: cờ, Smart Cam, lưới, replay |

Các script khác trong thư mục là công cụ cũ từ các phiên V9 và V10, giữ để tham khảo.
