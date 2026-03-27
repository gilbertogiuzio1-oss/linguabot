export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { word, imageQuery, englishTranslation } = req.body;
  const candidates = [imageQuery, englishTranslation?.split(/[\/,]/)[0]?.trim(), word].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(candidate)}&format=json&srlimit=1`,
        { headers: { 'User-Agent': 'LinguaBot/1.0' } }
      );
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const title = searchData?.query?.search?.[0]?.title;
      if (!title) continue;

      const pageRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { 'User-Agent': 'LinguaBot/1.0' } }
      );
      if (!pageRes.ok) continue;
      const pageData = await pageRes.json();
      if (pageData.thumbnail?.source) {
        return res.status(200).json({ imageUrl: pageData.thumbnail.source });
      }
    } catch (_) { /* try next candidate */ }
  }

  res.status(200).json({ imageUrl: null });
}
