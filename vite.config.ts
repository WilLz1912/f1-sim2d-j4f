import { defineConfig } from "vite";
import { resolve } from "node:path";

// Giai đoạn 0: phục vụ nguyên trạng file V11. Các trang mới của V12 sẽ thêm vào `input` sau.
const V11 = "v11/opus_argon_f1_2026_simulator_v11.html";

export default defineConfig({
  server: { open: "/track.html" },
  build: {
    rollupOptions: { input: { v11: resolve(__dirname, V11), track: resolve(__dirname, "track.html"), cars: resolve(__dirname, "cars.html"), physics: resolve(__dirname, "physics.html") } },
  },
});
