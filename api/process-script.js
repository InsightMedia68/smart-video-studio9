export default async function handler(request, response) {
  try {
    const { scriptContent } = request.body;

    if (!scriptContent || scriptContent.trim().length === 0) {
      return response.status(400).json({ error: "No script content provided." });
    }

    const prompt = `
Bạn là AI phân tích nội dung video YouTube. Dưới đây là nội dung video:

"""${scriptContent}"""

Trích xuất tối đa 15 từ khóa chính theo dạng JSON như sau:
{
  "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3"]
}

⚠️ Chỉ trả JSON đúng định dạng, không thêm bất kỳ chữ nào khác.
`;

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL_ID || "openai/gpt-4o";

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    // Ghi log phản hồi thực tế từ AI để debug
    console.log("Raw AI response:", raw);

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match || match.length === 0) {
      return response.status(400).json({ error: "AI response does not contain valid JSON." });
    }

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (err) {
      console.error("Failed to parse JSON from AI:", match[0]);
      return response.status(400).json({ error: "Could not parse extracted JSON." });
    }

    return response.status(200).json({ result: parsed });

  } catch (err) {
    console.error("Internal Server Error", err);
    return response.status(500).json({ error: "Internal server error." });
  }
}
