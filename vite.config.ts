import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { LAUNCH_PRESETS, PLATFORMS } from './src/data/platforms';
import {
  BYOK_FEDERATED_SOURCE_COUNT,
  OPEN_FEDERATED_SOURCE_COUNT,
} from './src/data/apiSources';

/**
 * Catalog sizes are derived from the registries at build time, so static HTML, the web
 * manifest and the SVG share card never advertise stale numbers again.
 */
export const CATALOG_TOKENS: Record<string, string> = {
  __CARTOGRAPH_OPEN_APIS__: String(OPEN_FEDERATED_SOURCE_COUNT),
  __CARTOGRAPH_BYOK_APIS__: String(BYOK_FEDERATED_SOURCE_COUNT),
  __CARTOGRAPH_PLATFORMS__: String(PLATFORMS.length),
  __CARTOGRAPH_PRESETS__: String(LAUNCH_PRESETS.length),
};

/** Files copied from public/ that carry catalog tokens. */
const TOKENIZED_PUBLIC_FILES = new Map<string, string>([
  ['404.html', 'text/html; charset=utf-8'],
  ['site.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['og-image.svg', 'image/svg+xml; charset=utf-8'],
]);

function replaceCatalogTokens(text: string): string {
  return Object.entries(CATALOG_TOKENS).reduce(
    (acc, [token, value]) => acc.split(token).join(value),
    text
  );
}

function injectCatalogStats(): Plugin {
  let outDir = 'dist';
  let publicDir = 'public';
  return {
    name: 'cartograph-catalog-stats',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      publicDir = config.publicDir;
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => replaceCatalogTokens(html),
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\/+/, '');
        const contentType = TOKENIZED_PUBLIC_FILES.get(name);
        const file = path.join(publicDir, name);
        if (!contentType || !existsSync(file)) return next();
        res.setHeader('Content-Type', contentType);
        res.end(replaceCatalogTokens(readFileSync(file, 'utf8')));
      });
    },
    writeBundle() {
      for (const name of TOKENIZED_PUBLIC_FILES.keys()) {
        const file = path.join(outDir, name);
        if (existsSync(file)) {
          writeFileSync(file, replaceCatalogTokens(readFileSync(file, 'utf8')));
        }
      }
    },
  };
}

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
  plugins: [react(), tailwindcss(), injectSearchConsoleMeta(), injectCatalogStats()],
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
