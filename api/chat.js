export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.action === 'verify') {
    const { pwd } = req.query;
    const correct = process.env.ADMIN_PASSWORD || '0420';
    return res.status(200).json({ ok: pwd === correct });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, maxTokens } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key 未設定，請在 Vercel 環境變數加入 ANTHROPIC_API_KEY' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: maxTokens || 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || `Anthropic API 錯誤 ${response.status}`,
      });
    }

    const text = data.content?.[0]?.text || '解析失敗，請稍後重試。';
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: `伺服器錯誤：${err.message}` });
  }
}
