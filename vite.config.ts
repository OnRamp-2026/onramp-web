import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    // 백엔드(onramp-api) 프록시 — 개발 중 CORS 회피
    proxy: {
      "/v1": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
