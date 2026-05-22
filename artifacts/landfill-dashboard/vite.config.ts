import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-query",
      "recharts",
      "date-fns",
      "next-themes",
      "wouter",
      "lucide-react",
      "react-csv",
      "@tanstack/react-table",
      "@radix-ui/react-slot",
      "@radix-ui/react-popover",
      "@radix-ui/react-label",
      "react-day-picker",
      "@radix-ui/react-select",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-progress",
      "@radix-ui/react-toggle",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
