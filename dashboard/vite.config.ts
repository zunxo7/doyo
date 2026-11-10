import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Built straight into the website, which is what gets published to letdoyo.com/dashboard/.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "../website/dashboard", emptyOutDir: true, chunkSizeWarningLimit: 6000 },
});
