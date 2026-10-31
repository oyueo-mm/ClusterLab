import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  worker: { format: "es" },
  plugins: [react()],
  base: "/ClusterLab/",
  test: { include: ["src/**/*.test.ts"] },
} as Parameters<typeof defineConfig>[0]);
