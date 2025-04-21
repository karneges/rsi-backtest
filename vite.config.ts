import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/rsi-backtest/",
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      charting_library: path.resolve(__dirname, "src/charting-library"),
    },
  },
  build: {
    commonjsOptions: {
      include: [/charting_library/, /node_modules/],
    },
    outDir: "dist",
    sourcemap: true,
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
