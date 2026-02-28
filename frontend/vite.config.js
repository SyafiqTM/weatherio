import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      // Forward /api/* to the Flask backend during development
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
