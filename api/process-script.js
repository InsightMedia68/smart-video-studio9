export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { scriptContent, translationStyle, targetAudience } = req.body || {};

        if (!scriptContent) {
            return res.status(400).json({ error: 'Missing scriptContent' });
        }

        // Nếu bạn dùng OpenRouter hoặc OpenAI, đây là nơi gọi API
        const completion = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant that converts each line of a Vietnamese script into structured translation + keywords. Format: [{"vietnamese":"...", "english":"...", "keywords":["..."]}]`
                    },
                    {
                        role: 'user',
                        content: `Hãy dịch từng dòng sau sang tiếng Anh và gợi ý từ khóa hình ảnh (3-5 từ khóa mỗi dòng) để tìm video minh họa. Trả về JSON array chuẩn như mẫu:\n\n${scriptContent}`
                    }
                ]
            })
        });

        const data = await completion.json();
        return res.status(200).json(data);
    } catch (err) {
        console.error('API error:', err);
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
}
