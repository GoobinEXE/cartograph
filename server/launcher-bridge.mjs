import http from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const BRIDGE_PORT = Number(process.env.PORT || process.env.BRIDGE_PORT || 4789);
const BRIDGE_HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const IS_CLOUD_ENV = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
    process.env.RENDER ||
    process.env.FLY_APP_NAME ||
    (process.env.PORT && BRIDGE_HOST !== '127.0.0.1' && BRIDGE_HOST !== 'localhost')
);
const CARTOGRAPH_USER_AGENT =
  'Cartograph/2.4 (Academic Metasearch Hub; https://cartographsearch.com)';
const args = new Set(process.argv.slice(2));

const ALLOWED_LOCAL_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/i;
const ALLOWED_PROD_ORIGINS = new Set([
  'https://cartographsearch.com',
  'https://www.cartographsearch.com',
  'https://cartographsearch.vercel.app',
]);

function isAllowedBridgeOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_LOCAL_ORIGIN_RE.test(origin) || ALLOWED_PROD_ORIGINS.has(origin);
}

function isLoopbackRequest(req) {
  const addr = req.socket?.remoteAddress || '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

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

function buildCorsHeaders(req) {
  const origin = typeof req?.headers?.origin === 'string' ? req.headers.origin.trim() : '';
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Origin',
  };
  if (origin && isAllowedBridgeOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}

function sendJson(res, statusCode, payload, req) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...buildCorsHeaders(req),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin.trim() : '';
  if (origin && !isAllowedBridgeOrigin(origin)) {
    sendJson(res, 403, { ok: false, error: 'Origem não autorizada no Launcher Bridge.' }, req);
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, buildCorsHeaders(req));
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
    sendJson(
      res,
      200,
      {
        ok: true,
        platform: process.platform,
        osName: osLabels[process.platform] || process.platform,
        nodeVersion: process.version,
        bridgePort: BRIDGE_PORT,
        loopbackOnly: !IS_CLOUD_ENV,
      },
      req
    );
    return;
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/launch-urls') {
    if (IS_CLOUD_ENV || !isLoopbackRequest(req)) {
      sendJson(
        res,
        403,
        { ok: false, error: 'Abertura nativa permitida apenas em execução local (loopback).' },
        req
      );
      return;
    }

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
          sendJson(res, 400, { ok: false, error: 'Nenhuma URL informada.' }, req);
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

        sendJson(
          res,
          200,
          {
            ok: true,
            launchedCount: results.filter((x) => x.ok).length,
            platform: process.platform,
            results,
          },
          req
        );
      } catch (err) {
        sendJson(
          res,
          500,
          {
            ok: false,
            error: err instanceof Error ? err.message : 'Erro ao processar lote de URLs',
          },
          req
        );
      }
    });
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/arxiv') {
    const query = reqUrl.searchParams.get('q') || '';
    const maxResults = Math.min(Math.max(1, Number(reqUrl.searchParams.get('max_results') || 12)), 25);
    if (!query.trim() || query.trim().length > 300) {
      sendJson(res, 400, { ok: false, error: 'Parâmetro q inválido ou ausente' }, req);
      return;
    }

    try {
      const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
        query.trim()
      )}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;
      const response = await fetch(arxivUrl, {
        headers: { 'User-Agent': CARTOGRAPH_USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      });
      const xmlText = await response.text();
      res.writeHead(response.ok ? 200 : response.status, {
        'Content-Type': 'application/xml; charset=utf-8',
        ...buildCorsHeaders(req),
      });
      res.end(xmlText);
    } catch (err) {
      sendJson(
        res,
        502,
        {
          ok: false,
          error: err instanceof Error ? err.message : 'Falha ao consultar arXiv API',
        },
        req
      );
    }
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/zenodo') {
    const query = (reqUrl.searchParams.get('q') || '').trim();
    const size = Math.min(Math.max(1, Number(reqUrl.searchParams.get('size') || 8)), 20);
    if (!query || query.length > 300) {
      sendJson(res, 400, { ok: false, error: 'Parâmetro q inválido ou ausente' }, req);
      return;
    }

    try {
      const zenodoUrl = `https://zenodo.org/api/records?q=${encodeURIComponent(
        query
      )}&size=${size}&sort=bestmatch`;
      const response = await fetch(zenodoUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': CARTOGRAPH_USER_AGENT,
        },
        signal: AbortSignal.timeout(10_000),
      });
      const data = await response.json();
      sendJson(res, response.status, data, req);
    } catch (err) {
      sendJson(
        res,
        502,
        {
          ok: false,
          error: err instanceof Error ? err.message : 'Falha ao consultar Zenodo API',
        },
        req
      );
    }
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/osti') {
    const query = (reqUrl.searchParams.get('q') || '').trim();
    const rows = Math.min(Math.max(1, Number(reqUrl.searchParams.get('rows') || 8)), 20);
    if (!query || query.length > 300) {
      sendJson(res, 400, { ok: false, error: 'Parâmetro q inválido ou ausente' }, req);
      return;
    }

    try {
      const ostiUrl = `https://www.osti.gov/api/v1/records?q=${encodeURIComponent(
        query
      )}&rows=${rows}`;
      const response = await fetch(ostiUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': CARTOGRAPH_USER_AGENT,
        },
        signal: AbortSignal.timeout(10_000),
      });
      const data = await response.json();
      sendJson(res, response.status, data, req);
    } catch (err) {
      sendJson(
        res,
        502,
        {
          ok: false,
          error: err instanceof Error ? err.message : 'Falha ao consultar OSTI.GOV API',
        },
        req
      );
    }
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/ntrs') {
    const query = (reqUrl.searchParams.get('q') || '').trim();
    const size = Math.min(Math.max(1, Number(reqUrl.searchParams.get('size') || 8)), 20);
    if (!query || query.length > 300) {
      sendJson(res, 400, { ok: false, error: 'Parâmetro q inválido ou ausente' }, req);
      return;
    }

    try {
      const ntrsUrl = `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(
        query
      )}&page%5Bsize%5D=${size}`;
      const response = await fetch(ntrsUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': CARTOGRAPH_USER_AGENT,
        },
        signal: AbortSignal.timeout(10_000),
      });
      const data = await response.json();
      sendJson(res, response.status, data, req);
    } catch (err) {
      sendJson(
        res,
        502,
        {
          ok: false,
          error: err instanceof Error ? err.message : 'Falha ao consultar NASA NTRS API',
        },
        req
      );
    }
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/translate') {
    const text = (reqUrl.searchParams.get('q') || '').trim();
    const allowedLangs = new Set(['pt', 'en', 'es', 'fr']);
    const fromRaw = (reqUrl.searchParams.get('from') || 'pt').trim().toLowerCase();
    const toRaw = (reqUrl.searchParams.get('to') || 'en').trim().toLowerCase();
    const from = allowedLangs.has(fromRaw) ? fromRaw : 'pt';
    const to = allowedLangs.has(toRaw) ? toRaw : 'en';
    if (!text || text.length > 300) {
      sendJson(res, 400, { ok: false, error: 'Texto vazio ou excede limite' }, req);
      return;
    }

    try {
      const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': CARTOGRAPH_USER_AGENT },
        signal: AbortSignal.timeout(6_000),
      });
      const data = await response.json();
      const translatedText = data?.responseData?.translatedText || text;
      sendJson(
        res,
        200,
        {
          ok: true,
          original: text,
          translated: translatedText,
        },
        req
      );
    } catch {
      sendJson(
        res,
        200,
        {
          ok: false,
          original: text,
          translated: text,
        },
        req
      );
    }
    return;
  }

  if (req.method === 'POST' && reqUrl.pathname === '/api/feedback') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 16_384) req.destroy();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(rawBody || '{}');
        const subject = String(parsed.subject || '').trim().slice(0, 160);
        const message = String(parsed.message || '').trim().slice(0, 4000);
        if (subject.length < 3 || message.length < 5) {
          sendJson(res, 400, { ok: false, error: 'Assunto e mensagem inválidos.' }, req);
          return;
        }
        const feedbackEntry = {
          id: parsed.id || `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: parsed.type || 'general',
          subject,
          message,
          relatedUrl: String(parsed.relatedUrl || '').trim().slice(0, 500) || undefined,
          institution: String(parsed.institution || '').trim().slice(0, 160) || undefined,
          userEmail: String(parsed.userEmail || '').trim().slice(0, 160) || undefined,
          rating: Math.min(5, Math.max(1, Number(parsed.rating || 5))),
          createdAt: parsed.createdAt || new Date().toISOString(),
          platform: process.platform,
        };

        const feedbackDir = path.resolve('data');
        if (!fs.existsSync(feedbackDir)) {
          fs.mkdirSync(feedbackDir, { recursive: true });
        }
        const feedbackFile = path.join(feedbackDir, 'user_feedback.jsonl');
        fs.appendFileSync(feedbackFile, JSON.stringify(feedbackEntry) + '\n', 'utf-8');

        sendJson(
          res,
          200,
          {
            ok: true,
            id: feedbackEntry.id,
            savedAt: feedbackEntry.createdAt,
            persistedRemotely: true,
            mode: 'local-bridge-file',
          },
          req
        );
      } catch (err) {
        sendJson(
          res,
          500,
          {
            ok: false,
            error: err instanceof Error ? err.message : 'Falha ao salvar feedback',
          },
          req
        );
      }
    });
    return;
  }

  if (req.method === 'GET' && reqUrl.pathname === '/api/feedback') {
    if (IS_CLOUD_ENV || !isLoopbackRequest(req)) {
      sendJson(res, 403, { ok: false, error: 'Leitura de feedbacks permitida apenas localmente.' }, req);
      return;
    }
    try {
      const feedbackFile = path.resolve('data', 'user_feedback.jsonl');
      if (!fs.existsSync(feedbackFile)) {
        sendJson(res, 200, { ok: true, items: [] }, req);
        return;
      }
      const raw = fs.readFileSync(feedbackFile, 'utf-8');
      const lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      sendJson(res, 200, { ok: true, items: lines }, req);
    } catch (err) {
      sendJson(
        res,
        500,
        {
          ok: false,
          error: err instanceof Error ? err.message : 'Falha ao listar feedbacks',
        },
        req
      );
    }
    return;
  }

  if (req.method === 'GET' && !reqUrl.pathname.startsWith('/api/')) {
    const distDir = path.resolve('dist');
    if (fs.existsSync(distDir)) {
      const safeRelPath = reqUrl.pathname === '/' ? 'index.html' : reqUrl.pathname.replace(/^\/+/, '');
      let candidatePath = path.resolve(distDir, safeRelPath);
      if (!candidatePath.startsWith(distDir) || !fs.existsSync(candidatePath) || fs.statSync(candidatePath).isDirectory()) {
        candidatePath = path.resolve(distDir, 'index.html');
      }
      if (fs.existsSync(candidatePath)) {
        const ext = path.extname(candidatePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(candidatePath).pipe(res);
        return;
      }
    }
  }

  sendJson(res, 404, { ok: false, error: 'Rota não encontrada no Launcher Bridge.' });
});

server.listen(BRIDGE_PORT, BRIDGE_HOST, () => {
  console.log(`[Cartograph Bridge] Servidor multiplataforma ativo em http://${BRIDGE_HOST}:${BRIDGE_PORT} (${process.platform})`);

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
