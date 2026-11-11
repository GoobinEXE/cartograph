import http from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { URL } from 'node:url';

const BRIDGE_PORT = Number(process.env.BRIDGE_PORT || 4789);
const args = new Set(process.argv.slice(2));

/**
 * Opens a URL natively in the user's default browser across Windows, macOS, and Linux.
 * Completely bypasses browser window.open() pop-up blockers.
 */
function openUrlNative(targetUrl) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        resolve({ url: targetUrl, ok: false, error: 'Unsupported protocol' });
        return;
      }
      const safeUrl = parsed.toString();
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows: use cmd.exe start with empty window title
        execFile('cmd.exe', ['/c', 'start', '', safeUrl], { windowsHide: true }, (err) => {
          resolve({ url: safeUrl, ok: !err, error: err ? err.message : undefined });
        });
      } else if (platform === 'darwin') {
        // macOS: use native open command
        execFile('open', [safeUrl], (err) => {
          resolve({ url: safeUrl, ok: !err, error: err ? err.message : undefined });
        });
      } else {
        // Linux / FreeBSD: use xdg-open
        execFile('xdg-open', [safeUrl], (err) => {
          resolve({ url: safeUrl, ok: !err, error: err ? err.message : undefined });
        });
      }
    } catch (e) {
      resolve({ url: targetUrl, ok: false, error: e instanceof Error ? e.message : 'Invalid URL' });
    }
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${BRIDGE_PORT}`);

  if (req.method === 'GET' && reqUrl.pathname === '/api/health') {
    const osLabels = {
      win32: 'Windows',
      darwin: 'macOS',
      linux: 'Linux',
    };
    sendJson(res, 200, {
      ok: true,
      platform: process.platform,
      osName: osLabels[process.platform] || process.platform,
      nodeVersion: process.version,
      bridgePort: BRIDGE_PORT,
    });
    return;
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/launch-urls') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 100_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(rawBody || '{}');
        const urls = Array.isArray(parsed.urls) ? parsed.urls.slice(0, 30) : [];
        if (urls.length === 0) {
          sendJson(res, 400, { ok: false, error: 'Nenhuma URL informada.' });
          return;
        }

        const results = [];
        for (let i = 0; i < urls.length; i++) {
          const r = await openUrlNative(String(urls[i]));
          results.push(r);
          // 110ms cadence prevents browser tab-storm freeze on Windows/Linux/macOS
          if (i < urls.length - 1) {
            await new Promise((rDelay) => setTimeout(rDelay, 110));
          }
        }

        sendJson(res, 200, {
          ok: true,
          launchedCount: results.filter((x) => x.ok).length,
          platform: process.platform,
          results,
        });
      } catch (err) {
        sendJson(res, 500, {
          ok: false,
          error: err instanceof Error ? err.message : 'Erro ao processar lote de URLs',
        });
      }
    });
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/arxiv') {
    const query = reqUrl.searchParams.get('q') || '';
    const maxResults = Math.min(Number(reqUrl.searchParams.get('max_results') || 12), 25);
    if (!query.trim()) {
      sendJson(res, 400, { ok: false, error: 'Parâmetro q ausente' });
      return;
    }

    try {
      const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
        query.trim()
      )}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;
      const response = await fetch(arxivUrl, {
        headers: { 'User-Agent': 'Cartograph/2.1 (Academic Metasearch Hub; mailto:research@cartograph.org)' },
      });
      const xmlText = await response.text();
      res.writeHead(200, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(xmlText);
    } catch (err) {
      sendJson(res, 502, {
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao consultar arXiv API',
      });
    }
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/zenodo') {
    const query = (reqUrl.searchParams.get('q') || '').trim();
    const size = Math.min(Number(reqUrl.searchParams.get('size') || 8), 20);
    if (!query) {
      sendJson(res, 400, { ok: false, error: 'Parâmetro q ausente' });
      return;
    }

    try {
      const zenodoUrl = `https://zenodo.org/api/records?q=${encodeURIComponent(
        query
      )}&size=${size}&sort=bestmatch`;
      const response = await fetch(zenodoUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Cartograph/2.1 (Academic Metasearch Hub)',
        },
      });
      const data = await response.json();
      sendJson(res, response.status, data);
    } catch (err) {
      sendJson(res, 502, {
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao consultar Zenodo API',
      });
    }
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/translate') {
    const text = (reqUrl.searchParams.get('q') || '').trim();
    const from = reqUrl.searchParams.get('from') || 'pt';
    const to = reqUrl.searchParams.get('to') || 'en';
    if (!text) {
      sendJson(res, 400, { ok: false, error: 'Texto vazio' });
      return;
    }

    try {
      const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      const translatedText = data?.responseData?.translatedText || text;
      sendJson(res, 200, {
        ok: true,
        original: text,
        translated: translatedText,
      });
    } catch {
      sendJson(res, 200, {
        ok: false,
        original: text,
        translated: text,
      });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Rota não encontrada no Launcher Bridge.' });
});

server.listen(BRIDGE_PORT, '127.0.0.1', () => {
  console.log(`[Cartograph Bridge] Servidor multiplataforma ativo em http://127.0.0.1:${BRIDGE_PORT} (${process.platform})`);

  if (args.has('--with-vite')) {
    const isWin = process.platform === 'win32';
    const npxCmd = isWin ? 'npx.cmd' : 'npx';
    const viteArgs = ['vite', '--port', '5173'];
    if (args.has('--open')) {
      viteArgs.push('--open');
    }
    const viteProc = spawn(npxCmd, viteArgs, {
      stdio: 'inherit',
      shell: isWin,
    });
    viteProc.on('exit', (code) => {
      server.close();
      process.exit(code ?? 0);
    });
  }
});
