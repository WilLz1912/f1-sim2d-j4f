# OPUS · ARGON F1 2026 SIMULATOR — V12 project

Giả lập F1 2026 (đua và phân hạng) theo hướng thực tế và vui. V11 là một file HTML duy nhất
(`v11/opus_argon_f1_2026_simulator_v11.html`). Bản này được **giữ nguyên làm demo** và làm chuẩn
so sánh. V12 tách V11 thành một project local thực thụ.

Lịch sử: Argon dựng lõi V8 và V9 (giao diện, hình vẽ xe, DNA đội và tay đua). Opus làm V10 và V11
trên nền đó. Không bỏ những gì Argon xây dựng. Tên project giữ dạng "Opus · Argon".

Chi tiết trạng thái, số liệu hiệu chỉnh và lịch sử sửa lỗi nằm ở `docs/HANDOFF.md`. Đọc file đó
trước khi sửa vật lý, va chạm, pit hoặc phân hạng.

---

## Cách làm việc với người dùng (bắt buộc)

- Trả lời bằng **tiếng Việt**. Tiếng Anh chỉ dùng cho thuật ngữ kỹ thuật không có từ tương đương
  (undercut, stint, overfitting...). Xưng "bạn" hoặc "mình".
- **Thảo luận trước, chưa sửa code khi người dùng chưa đồng ý.** Câu "tôi đã bảo làm đâu" từng
  xảy ra, đừng lặp lại. Việc hiển nhiên mà người dùng không trả lời thì coi như đồng ý.
- **Nêu ý kiến riêng và phản đối khi đề xuất của người dùng chưa hợp lý.** Không chiều theo.
- **Trung thực.** Không bịa số. Số nào là ước lượng thì nói rõ. Lỗi do mình gây ra thì báo ngay.
- Theo dõi tiến độ bằng danh sách công việc. Chỉ dừng lại khi cần người dùng quyết định thiết kế,
  khi phải báo người dùng chờ test dài, hoặc khi giao bản build.
- **Không smoke test vô tận.** Đưa file cho người dùng chạy thử sớm, vì người quan sát thấy nhiều
  hơn số đo.
- Đổi gì liên quan va chạm hoặc an toàn thì **phải đo cả số pha vượt**.
- Mọi thay đổi phải cho kết quả **tối thiểu tương đương hoặc tốt hơn** bản trước: pha vượt, tai
  nạn, pit, double stack.
- Giữ nguyên UI và hình vẽ xe ("đừng biến xe thành mấy hình chữ nhật").
- Một thay đổi gây tác dụng ngược nặng thì **báo người dùng, đừng cố vòng lặp sửa**.

## Ràng buộc phần cứng (mục tiêu V12)

- Chạy local, **mượt trên mọi cấu hình**. Máy người dùng: i5 thế hệ 10, 25 GB RAM, GTX 1650.
- Kỳ vọng chỉ dùng **khoảng 10% máy**: một giả lập nhẹ nhàng, tính toán ở mức tối thiểu cần thiết.
- Mọi hệ thống nặng (Monte Carlo chiến thuật, lốp nhiệt, thời tiết...) phải có **ngân sách tính
  toán**, tự co lại trên máy yếu. Mặc định khiêm tốn: vài chục đến vài trăm kịch bản rút gọn mỗi
  vòng cho mỗi đội, không phải hàng nghìn.
- Đo fps và thời gian CPU mỗi khung hình trước và sau mỗi thay đổi lớn (`tools/harness/prof.js`).
- Đã đo trên V11 (máy test không có GPU): vật lý 1.2 ms và vẽ 1.4 ms mỗi khung hình ở 1x, nhưng chỉ
  đạt khoảng 49 fps. Thủ phạm nhiều khả năng là `backdrop-filter: blur` trên các bảng phủ lên
  canvas, cộng với việc vẽ lại toàn bộ đường đua mỗi khung hình. Đó là việc cần sửa đầu tiên.

## Nguyên tắc kỹ thuật

1. **Tách dần, không viết lại.** V11 đã hiệu chỉnh kỹ. Tách module mà giữ nguyên hành vi, kiểm
   chứng bằng kết quả golden với seed cố định trước khi thêm tính năng.
2. **Tính lặp lại.** Cùng seed thì cùng kết quả, trên mọi máy. Dùng một RNG có seed duy nhất (V11
   dùng `Math.random`, các harness thay bằng mulberry32). Tính toán song song (worker) theo kiểu
   lockstep: câu hỏi gửi ở thời điểm race cố định, câu trả lời áp dụng sau một khoảng thời gian
   race cố định. Chưa tính xong thì sim chờ. Không được để kết quả phụ thuộc tốc độ máy.
3. **Lõi `sim/` không đụng tới DOM.** `logMsg`, `showToast` đi qua một event bus. Chạy được không
   giao diện trong Node, cho test và cho chạy hàng loạt.
4. Hệ thống mới phải **thấy được và đo được**, so được với dữ liệu thật. Tính nặng mà không tạo
   khác biệt nhìn thấy được thì không làm.

## Công nghệ đã thống nhất

TypeScript, Vite (`npm run dev`), Vitest (test golden). Vẽ bằng Canvas 2D (giữ hình vẽ xe), có thể
đổi sang PixiJS sau mà chỉ ảnh hưởng `render/`. Vật lý chạy trong Web Worker. Chạy hàng loạt không
giao diện bằng Node `worker_threads`. Python chỉ dùng cho phân tích (pandas, matplotlib, FastF1),
không dùng cho giả lập chính. Đóng thành app (Tauri hoặc Electron) để sau. Dùng git từ giai đoạn 0.

## Lộ trình

| Giai đoạn | Nội dung | Kiểm chứng |
|---|---|---|
| 0 | Dựng project, đưa V11 vào nguyên trạng, sinh kết quả golden (race seed 32/33/34, battles seed 33, phân hạng seed 3, qcal) | V11 chạy được bằng `npm run dev` |
| 1 | Tách data ra JSON: track, team, driver | Golden khớp 100% |
| 2 | Tách lõi `sim/` khỏi DOM, gom RNG về một nguồn có seed | Golden khớp, chạy được không giao diện |
| 3 | Tách `render/`, `director/` (Smart Cam, replay), `ui/`. Sửa hiệu năng: bỏ blur, lưu sẵn lớp đường đua, giới hạn DPR | fps trước và sau |
| 4 | Vật lý sang Web Worker. Lệnh `npm run bench` chạy hàng loạt đa lõi | Báo cáo thống kê nhiều seed |
| 5 | Tính năng mới, xem danh sách bên dưới | Mỗi tính năng có số đo trước và sau |

## Tính năng mới đã bàn (sau giai đoạn 4), theo thứ tự ưu tiên đề xuất

1. **Bàn chiến thuật Monte Carlo cho từng đội.** Mỗi vòng chạy ngầm các race rút gọn để quyết thời
   điểm pit, undercut hay overcut, phản ứng khi có SC, chọn lốp. Đội giỏi chạy nhiều kịch bản hơn
   và có mô hình sát hơn. Ferrari có xác suất nhỏ (khoảng 1%) đọc sai. Hiện bảng chiến thuật trên
   màn hình kèm lý do.
2. **Lốp nhiệt và mòn**: nhiệt mặt và nhiệt lõi, áp suất, mòn theo năng lượng từng góc, graining
   và blistering, cao su tích trên line, viên cao su ngoài line.
3. **Thời tiết động**: radar dự báo mà các đội đọc với độ chính xác khác nhau, mặt đường ướt theo
   đoạn, lốp Intermediate và Wet, thời điểm đổi lốp.
4. **Bài toán năng lượng 2026 cho từng xe**, thay luật tay hiện tại.
5. **Vùng khí nhiễu 2D** phía sau xe, có lớp hiển thị.
6. Để sau: động lực học đầy đủ hơn, hao mòn linh kiện cả mùa, chế độ mùa giải.

Các việc còn dở từ V11 (A5, B1–B5, C1, D1, Smart Cam cho phân hạng) xem ở `docs/HANDOFF.md`.

## Công cụ đo

Xem `tools/harness/README.md`. Mọi harness nhận đường dẫn file HTML của V11. Khi tách module xong,
đổi harness sang import lõi `sim/` trực tiếp, nhưng vẫn giữ nguyên cách tính số liệu.
