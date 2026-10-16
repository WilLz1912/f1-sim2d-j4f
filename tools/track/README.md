# Pipeline dựng đường đua (Python)

Chạy theo thứ tự từ thư mục gốc project:

1. `python tools/track/openf1_fetch.py 11303` — dữ liệu phân hạng Barcelona 2026 (OpenF1) vào `data/openf1/`.
2. `python tools/track/align.py` — chọn vòng F1 trong OSM và căn hệ toạ độ OpenF1 về UTM 31N.
3. `python tools/track/ortho_fetch.py` — tải ảnh trực giao ICGC 25 cm vào `data/imagery/` (không có trong git, khoảng 13 MB).
4. `python tools/track/build_centreline.py` — tâm đường, mép, kerb, vạch thời gian.
5. `python tools/track/build_track.py` — góc cua, pit lane, các vạch 2026, lưới xuất phát, công trình, ra `track.json`.
6. `python tools/track/build_surface.py` — bản đồ mặt đất 0.5 m `surface.png` (cho vật lý).
7. `python tools/track/build_render.py` — lớp đồ hoạ vector `render.json` (run-off, sỏi, cây, rào) và khoảng cách
   rào chắn cho vật lý (biên vùng chạy được, ghi lại vào `track.json`). Luôn chạy sau bước 6.

Ngoài ra `data/multiviewer/catalunya_2026.json` (góc cua, marshal, pit loss chính thức) tải một lần từ
`https://api.multiviewer.app/api/v1/circuits/15/2026`.

Kiểm tra: `python tools/track/qa_view.py out.jpg <s1> <s2> ...` vẽ mép, kerb, vạch lên ảnh thật;
`python tools/track/tum_compare.py` so độ rộng với TUM. Xem trực quan: `npm run dev`, mở `/track.html`.

Thư viện: numpy, scipy, pillow, pyproj, shapely, pypdf. Mọi giá trị trong `track.json` có trường nguồn
(`fia`, `openf1`, `ortho`, `osm`, `estimate`).
