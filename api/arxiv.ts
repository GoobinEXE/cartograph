export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const query = (req.query?.q || '').trim();
  const maxResults = Math.min(Number(req.query?.max_results || 12), 25);

  if (!query) {
    return res.status(400).json({ ok: false, error: 'Parâmetro q ausente' });
  }

  try {
    const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      query
    )}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

    const response = await fetch(arxivUrl, {
      headers: {
        'User-Agent': 'Cartograph/2.1 (Academic Metasearch Hub; mailto:research@cartograph.org)',
      },
    });

    const xmlText = await response.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(xmlText);
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao consultar arXiv API',
    });
  }
}

