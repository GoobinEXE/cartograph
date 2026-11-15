import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function injectSearchConsoleMeta(): Plugin {
  return {
    name: 'inject-gsc-verification',
    transformIndexHtml(html) {
      const gscToken = process.env.VITE_GSC_VERIFICATION?.trim();
      if (!gscToken) return html;
      const safeToken = gscToken.replace(/"/g, '&quot;');
      return html.replace(
        '</head>',
        `    <meta name="google-site-verification" content="${safeToken}" />\n  </head>`
      );
    },
  };
}

export default defineConfig({
  base: process.env.TAURI_ENV_PLATFORM ? './' : '/',
  plugins: [react(), tailwindcss(), injectSearchConsoleMeta()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4789',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'icons-vendor': ['lucide-react'],
        },
      },
    },
  },
});
