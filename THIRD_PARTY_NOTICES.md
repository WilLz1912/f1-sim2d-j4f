# Third-party data

Hình học Circuit de Barcelona-Catalunya được ghép từ hai nguồn sau (xem `data/geometry/`).

| File | Nguồn | Giấy phép |
|---|---|---|
| `data/geometry/dl_tum/Catalunya.csv` | [TUMFTM/racetrack-database](https://github.com/TUMFTM/racetrack-database), Technical University of Munich | LGPL-3.0, toàn văn ở `data/geometry/dl_tum/LICENSE` |
| `data/geometry/dl_geo/es-1991.geojson` | [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits), Tomislav Bacinger | MIT |

Các file JSON khác trong `data/geometry/` (`bcn_*.json`, `geo_bcn.json`) là dữ liệu dẫn xuất từ hai nguồn trên,
sinh bằng `splice.py`, `splice_build.py`, `geo_build.py`.
