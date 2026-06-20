export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { parts } = req.body;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,  // never exposed to client
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.25, topK: 40, topP: 0.95, maxOutputTokens: 2048 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    }
  );

  const data = await geminiRes.json();
  res.status(geminiRes.status).json(data);
}
