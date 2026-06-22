import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@prosa/core": path.resolve(__dirname, "src/packages/core/index.js"),
      "@prosa/ui":   path.resolve(__dirname, "src/packages/ui/index.jsx"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
      },
    },
  },
});
