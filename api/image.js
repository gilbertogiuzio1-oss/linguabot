export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageQuery, englishTranslation, word } = req.body;
  const query = imageQuery || englishTranslation?.split(/[\/,]/)[0]?.trim() || word;

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`,
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    );
    if (response.ok) {
      const data = await response.json();
      const imageUrl = data.photos?.[0]?.src?.medium || null;
      return res.status(200).json({ imageUrl });
    }
  } catch (_) {}

  res.status(200).json({ imageUrl: null });
}
