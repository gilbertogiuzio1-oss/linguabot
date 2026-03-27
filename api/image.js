export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { word, imageQuery, englishTranslation } = req.body;
  const candidates = [imageQuery, englishTranslation?.split(/[\/,]/)[0]?.trim(), word].filter(Boolean);

  for (const candidate of candidates) {
    try {
      // Single Wikipedia call: search + thumbnail combined
      const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(candidate)}&prop=pageimages&format=json&pithumbsize=400&gsrlimit=1&origin=*`;
      const wikiRes = await fetch(url, { headers: { 'User-Agent': 'LinguaBot/1.0' } });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const pages = wikiData?.query?.pages;
        if (pages) {
          const page = Object.values(pages)[0];
          if (page?.thumbnail?.source) {
            return res.status(200).json({ imageUrl: page.thumbnail.source });
          }
        }
      }
    } catch (_) { /* try next candidate */ }
  }

  res.status(200).json({ imageUrl: null });
}
