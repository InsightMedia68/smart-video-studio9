export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const { scriptContent } = req.body;

    if (!scriptContent || scriptContent.trim().length === 0) {
      return res.status(400).json({ error: "No script content provided." });
    }

    const prompt = `
Bạn sẽ nhận một kịch bản video. Nhiệm vụ của bạn: 
1. Trích xuất tối đa 15 từ khóa quan trọng nhất liên quan đến nội dung.
2. Trả về dưới dạng JSON CHUẨN theo đúng mẫu sau. Tuyệt đối không được thêm bất kỳ chữ nào khác ngoài JSON:

{
  "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3"]
}

Kịch bản: 
${scriptContent}
`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL_ID || "openai/gpt-3.5-turbo";

    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const fetchResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: "Bạn là công cụ JSON parser. Luôn trả về JSON đúng chuẩn. Không được ghi thêm chữ nào."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      })
    });

    const rawText = await fetchResponse.text();

    if (!fetchResponse.ok) {
      return res.status(500).json({ error: "AI API error", detail: rawText });
    }

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({ error: "AI response not valid JSON", raw: rawText });
    }

    const content = json?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return res.status(400).json({ error: "AI returned an empty response.", raw: rawText });
    }

    const jsonBlock = content.match(/\{[\s\S]*\}/);
    if (!jsonBlock) {
      return res.status(400).json({ error: "AI response is not valid JSON.", aiContent: content });
    }

    let result;
    try {
      result = JSON.parse(jsonBlock[0]);
    } catch (e) {
      return res.status(400).json({ error: "Could not parse JSON block.", jsonBlock: jsonBlock[0] });
    }

    if (!Array.isArray(result.keywords)) {
      return res.status(400).json({ error: "Missing 'keywords' array in result.", result });
    }

    return res.status(200).json({ result });

  } catch (err) {
    return res.status(500).json({ error: "Unhandled server error", detail: err.message });
  }
}
