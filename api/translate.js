export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'Word is required' });

  const prompt = `You are a linguistics expert. The user typed the word: "${word}"

Respond ONLY with a valid JSON object (no markdown, no explanation outside JSON) with this exact structure:
{
  "word": "${word}",
  "detectedLanguage": "the language this word comes from",
  "wordType": "noun/verb/adjective/etc",
  "explanation": "A concise, interesting explanation of the word's meaning and origin (2-3 sentences max)",
  "imageQuery": "A short descriptive phrase for finding a related image (e.g., 'happy dog' for the word 'joy')",
  "translations": {
    "English": { "translation": "the word in English", "example": "A natural example sentence using this word in English" },
    "French": { "translation": "the word in French", "example": "A natural example sentence using this word in French" },
    "Spanish": { "translation": "the word in Spanish", "example": "A natural example sentence using this word in Spanish" },
    "German": { "translation": "the word in German", "example": "A natural example sentence using this word in German" },
    "Italian": { "translation": "the word in Italian", "example": "A natural example sentence using this word in Italian" },
    "Portuguese": { "translation": "the word in Portuguese", "example": "A natural example sentence using this word in Portuguese" }
  }
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    // Add audio URLs and image URL
    const langCodes = {
      English: 'en',
      French: 'fr',
      Spanish: 'es',
      German: 'de',
      Italian: 'it',
      Portuguese: 'pt'
    };
    for (const lang in result.translations) {
      const translation = result.translations[lang].translation;
      const langCode = langCodes[lang];
      result.translations[lang].audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&q=${encodeURIComponent(translation)}&client=tw-ob`;
    }
    // Try Wikipedia for a relevant image using search API
    const englishTranslation = result.translations?.English?.translation?.split(/[\/,]/)[0].trim();
    const wikiCandidates = [result.imageQuery, englishTranslation, result.word].filter(Boolean);
    for (const candidate of wikiCandidates) {
      try {
        // Use Wikipedia search to find best matching article
        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(candidate)}&format=json&srlimit=1`,
          { headers: { 'User-Agent': 'LinguaBot/1.0' } }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const title = searchData?.query?.search?.[0]?.title;
          if (title) {
            const pageRes = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
              { headers: { 'User-Agent': 'LinguaBot/1.0' } }
            );
            if (pageRes.ok) {
              const pageData = await pageRes.json();
              if (pageData.thumbnail?.source) {
                result.imageUrl = pageData.thumbnail.source;
                break;
              }
            }
          }
        }
      } catch (_) { /* continue to next candidate */ }
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process word' });
  }
}
