export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const query = (req.query?.q || '').trim();
  const size = Math.min(Number(req.query?.size || 8), 20);

  if (!query) {
    return res.status(400).json({ ok: false, error: 'Parâmetro q ausente' });
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
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao consultar Zenodo API',
    });
  }
}

