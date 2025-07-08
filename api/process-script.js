export default async function handler(request, response) {
  try {
    const { scriptContent } = request.body;

    const prompt = `
Bạn là một AI phân tích nội dung video. Hãy đọc đoạn kịch bản sau:

"""${scriptContent}"""

Trích xuất ra tối đa 15 từ khóa quan trọng nhất (ưu tiên cụ thể, hữu ích cho tìm kiếm video minh hoạ).

Trả kết quả dưới dạng JSON chuẩn, theo đúng cấu trúc:
{
  "keywords": ["từ khóa 1", "từ khóa 2", ..., "từ khóa n"]
}

CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH, KHÔNG VIẾT GÌ BÊN NGOÀI.
`;

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL_ID || "openai/gpt-4o";

    const rawRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5
      })
    });

    const data = await rawRes.json();
    const rawText = data?.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      return response.status(400).json({ error: "AI returned an invalid format. Could not parse JSON." });
    }

    return response.status(200).json({ result: parsed });
  } catch (err) {
    console.error("Server error:", err);
    return response.status(500).json({ error: "Internal server error" });
  }
}
