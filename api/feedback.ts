const recentFeedbackMemory: Array<Record<string, unknown>> = [];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, items: recentFeedbackMemory });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const entry = {
        id: body.id || `fb-${Date.now()}`,
        type: body.type || 'general',
        subject: String(body.subject || '').trim(),
        message: String(body.message || '').trim(),
        relatedUrl: body.relatedUrl ? String(body.relatedUrl).trim() : undefined,
        institution: body.institution ? String(body.institution).trim() : undefined,
        userEmail: body.userEmail ? String(body.userEmail).trim() : undefined,
        rating: Number(body.rating || 5),
        createdAt: body.createdAt || new Date().toISOString(),
      };
      recentFeedbackMemory.unshift(entry);
      if (recentFeedbackMemory.length > 50) recentFeedbackMemory.pop();

      return res.status(200).json({ ok: true, id: entry.id, savedAt: entry.createdAt });
    } catch (err: any) {
      return res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Payload inválido',
      });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método não permitido' });
}
