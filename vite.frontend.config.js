import { v4wp } from "@kucrut/vite-for-wp";
import react from "@vitejs/plugin-react";
import path from "path";

export default {
  plugins: [
    v4wp({
      input: "src/frontend/main.jsx",
      outDir: "assets/frontend/dist",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'terser',
    sourcemap: false, // No source maps in production
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
          ],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remove console statements in production
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 1000,
  },
};
