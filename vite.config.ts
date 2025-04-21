import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync, copySync } from "fs-extra";

// Function to recursively copy directory
function copyDirectory(source, destination) {
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }

  const files = readdirSync(source);
  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);

    if (statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      copyFileSync(sourcePath, destPath);
    }
  });
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-charting-library",
      writeBundle() {
        // Copy charting library files to dist
        const sourceDir = path.resolve(__dirname, "src/charting-library");
        const targetDir = path.resolve(__dirname, "dist/charting-library");
        copyDirectory(sourceDir, targetDir);
      },
    },
  ],
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
