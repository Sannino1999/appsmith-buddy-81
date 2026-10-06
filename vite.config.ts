import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    tailwindcss(),
    nitro({ preset: "node-server" }),
    // React's Vite plugin must run after TanStack Start.
    react(),
  ],
});
