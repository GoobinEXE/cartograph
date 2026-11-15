import {
  applyCorsHeaders,
  CARTOGRAPH_USER_AGENT,
  enforceRateLimit,
  type MinimalRequest,
  type MinimalResponse,
} from './_security';

const ALLOWED_TYPES = new Set(['suggestion', 'correction', 'feature', 'general']);
const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sanitizeHttpUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    return parsed.toString().slice(0, 500);
  } catch {
    return undefined;
  }
}

export default async function handler(req: MinimalRequest, res: MinimalResponse) {
  if (applyCorsHeaders(req, res, 'POST, OPTIONS')) return;

  // Never expose submitted user emails, institutions or messages via GET
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  const allowed = await enforceRateLimit(req, res, {
    keyPrefix: 'feedback',
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!allowed) return;

  try {
    const rawStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (rawStr.length > 16_384) {
      return res.status(413).json({ ok: false, error: 'Payload excede o limite permitido' });
    }

    const body = (
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    ) as Record<string, unknown>;

    const type = typeof body.type === 'string' && ALLOWED_TYPES.has(body.type) ? body.type : 'general';
    const subject = String(body.subject || '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .trim()
      .slice(0, 160);
    const message = String(body.message || '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
      .trim()
      .slice(0, 4000);

    if (subject.length < 3 || message.length < 5) {
      return res.status(400).json({
        ok: false,
        error: 'Assunto (mín. 3) e mensagem (mín. 5 caracteres) são obrigatórios',
      });
    }

    const rawEmail = typeof body.userEmail === 'string' ? body.userEmail.trim().slice(0, 160) : '';
    if (rawEmail && !SIMPLE_EMAIL_RE.test(rawEmail)) {
      return res.status(400).json({ ok: false, error: 'E-mail informado é inválido' });
    }

    const rawRating = Number(body.rating ?? 5);
    const rating = Number.isFinite(rawRating)
      ? Math.min(5, Math.max(1, Math.round(rawRating)))
      : 5;

    const entry = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      subject,
      message,
      relatedUrl: sanitizeHttpUrl(body.relatedUrl),
      institution:
        typeof body.institution === 'string'
          ? body.institution.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 160) || undefined
          : undefined,
      userEmail: rawEmail || undefined,
      rating,
      createdAt: new Date().toISOString(),
    };

    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': CARTOGRAPH_USER_AGENT,
        },
        body: JSON.stringify({
          source: 'cartograph-web',
          ...entry,
        }),
        signal: AbortSignal.timeout(5_000),
      });

      if (!webhookRes.ok) {
        return res.status(502).json({
          ok: false,
          persistedRemotely: false,
          error: 'Falha ao encaminhar feedback para o destino configurado',
        });
      }

      return res.status(200).json({
        ok: true,
        id: entry.id,
        savedAt: entry.createdAt,
        persistedRemotely: true,
        mode: 'webhook',
      });
    }

    return res.status(202).json({
      ok: true,
      id: entry.id,
      savedAt: entry.createdAt,
      persistedRemotely: false,
      mode: 'local-only',
    });
  } catch (err: unknown) {
    return res.status(400).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Payload inválido',
    });
  }
}
