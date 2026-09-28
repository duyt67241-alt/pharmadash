import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Tách thư viện lớn ra chunk riêng để trình duyệt cache tốt hơn
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
    // Chuyển tiếp /api sang backend Express
    proxy: { '/api': 'http://localhost:4000' },
  },
});
