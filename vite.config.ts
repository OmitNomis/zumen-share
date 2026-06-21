import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: "pb_public",
    emptyOutDir: true,
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:8090" },
  },
  plugins: [react(), tailwindcss()],
});
