module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.OPENROUTER_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Missing API Key' });
  }

  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Missing content' });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistralai/mixtral-8x7b",
        messages: [
          {
            role: "user",
            content: `Từ nội dung sau đây hãy trích xuất 5 từ khóa minh họa video: "${content}"`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0].message) {
      throw new Error("Lỗi định dạng phản hồi từ OpenRouter");
    }

    res.status(200).json({ keywords: data.choices[0].message.content });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
};
