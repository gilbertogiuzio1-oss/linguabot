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
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process word' });
  }
}
