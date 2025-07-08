export default async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      return response.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const { scriptContent } = request.body;

    if (!scriptContent || typeof scriptContent !== "string" || scriptContent.trim().length === 0) {
      return response.status(400).json({ error: "No script content provided." });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL_ID || "openai/gpt-4o";

    if (!apiKey) {
      return response.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const prompt = `Dưới đây là một đoạn kịch bản video:\n\n${scriptContent}\n\nHãy trích xuất tối đa 15 từ khóa quan trọng nhất liên quan đến nội dung trên. Chỉ trả về đúng định dạng JSON như sau, KHÔNG thêm gì khác ngoài JSON:\n\n{\n  "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3"]\n}`;

    console.log("✅ [Prompt gửi lên AI]:\n", prompt);

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("❌ [AI API error raw text]:\n", errText);
      return response.status(aiRes.status).json({ error: "AI API error", detail: errText });
    }

    const data = await aiRes.json();

    const raw = data?.choices?.[0]?.message?.content?.trim();

    console.log("✅ [Phản hồi từ AI]:\n", raw);

    if (!raw) {
      return response.status(400).json({ error: "AI returned an empty response." });
    }

    const jsonMatch = raw.match(/\{[\s\S]*?\}/);

    if (!jsonMatch || jsonMatch.length === 0) {
      return response.status(400).json({ error: "AI response does not contain valid JSON." });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("❌ [Lỗi parse JSON]:", err);
      return response.status(400).json({ error: "Could not parse JSON from AI response." });
    }

    if (!parsed.keywords || !Array.isArray(parsed.keywords)) {
      return response.status(400).json({ error: "JSON does not contain valid 'keywords' array." });
    }

    return response.status(200).json({ result: parsed });
  } catch (err) {
    console.error("❌ [Lỗi không xác định]:", err);
    return response.status(500).json({ error: "Internal server error" });
  }
}
