export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const text = (req.query?.q || '').trim();
  const from = req.query?.from || 'pt';
  const to = req.query?.to || 'en';

  if (!text) {
    return res.status(400).json({ ok: false, error: 'Texto vazio' });
  }

  try {
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${from}|${to}`;

    const response = await fetch(apiUrl);
    const data = await response.json();
    const translatedText = data?.responseData?.translatedText || text;

    return res.status(200).json({
      ok: true,
      original: text,
      translated: translatedText,
    });
  } catch {
    return res.status(200).json({
      ok: false,
      original: text,
      translated: text,
    });
  }
}

