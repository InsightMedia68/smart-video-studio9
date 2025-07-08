export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    let payload = null; 

    try {
        const { scriptContent, translationStyle, targetAudience } = request.body;

        if (!scriptContent) {
            return response.status(400).json({ error: 'scriptContent is required in the request body.' });
        }

        const API_KEY = process.env.OPENROUTER_API_KEY;
        const MODEL_ID = process.env.OPENROUTER_MODEL_ID || "deepseek/deepseek-chat";
        const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

        if (!API_KEY) {
            console.error('CRITICAL: OPENROUTER_API_KEY environment variable is not set on the server.');
            return response.status(500).json({ error: 'Server configuration error: Missing API key.' });
        }

        const userInputDetails = {
            style: translationStyle || 'default',
            audience: targetAudience || 'a general audience'
        };
        const detailsJsonString = JSON.stringify(userInputDetails);

        const systemPrompt = `You are an expert video production assistant. Your task is to analyze a Vietnamese video script and prepare it for production.\\nFor each line of the script, you must perform two tasks:\\n1.  Translate the Vietnamese line into English. The translation should be high-quality and suitable for a voice-over. CRITICAL: Adhere to the specified translation style and target audience details provided in the following JSON object: ${detailsJsonString}.\\n2.  Extract 2-4 highly relevant visual keywords in ENGLISH that capture the essence of the line's content. These keywords will be used to find stock footage.\\n\\nYou MUST return the output as a single, valid JSON array of objects. Each object in the array represents a scene and MUST contain these exact keys: \\\"vietnamese\\\", \\\"english\\\", \\\"keywords\\\".\\n- \\\"vietnamese\\\": The original Vietnamese line.\\n- \\\"english\\\": The full English translation reflecting the requested style and audience.\\n- \\\"keywords\\\": An array of English keyword strings.\\n\\nDo not include any introductory text, explanations, or markdown formatting like \\\\\\`\\\\\\`\\\\\\`json around the final JSON output. Your entire response must be only the JSON array.`;

        const userPrompt = `Here is the script to process:\\n\\n${scriptContent}`;

        payload = {
            model: MODEL_ID,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        };

        let apiResponse;
        try {
            apiResponse = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('OpenRouter API fetch failed:', error);
            return response.status(500).json({ 
                success: false, 
                error: 'AI_SERVICE_UNREACHABLE', 
                message: 'Không thể kết nối đến dịch vụ AI.', 
                details: error.message 
            });
        }
        
        if (!apiResponse.ok) {
            const errorDetails = await apiResponse.text();
            console.error(`OpenRouter API Error (${apiResponse.status}):`, errorDetails);
            return response.status(apiResponse.status).json({
                success: false,
                error: 'AI_SERVICE_ERROR',
                details: errorDetails,
                status: apiResponse.status
            });
        }
        
                // Step 1: Phân tích cú pháp phản hồi từ OpenRouter dưới dạng JSON ngay trên server.
        // Đây là bước xác thực quan trọng. Nếu phản hồi không phải là JSON hợp lệ,
        // nó sẽ tạo ra một lỗi và được khối catch chính của chúng ta xử lý,
        // ngăn chặn hàm bị sập và gửi đi một lỗi 500 không phải JSON.
        const responseData = await apiResponse.json();

        // Step 2: (Tùy chọn nhưng Rất khuyến khích) Xác thực cấu trúc của phản hồi.
        // Điều này đảm bảo chúng ta không chuyển một cấu trúc không mong muốn cho client.
        if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message || !responseData.choices[0].message.content) {
            console.error('CRITICAL: Cấu trúc dữ liệu không hợp lệ hoặc không đầy đủ từ OpenRouter API:', JSON.stringify(responseData));
            return response.status(502).json({ 
                error: 'Bad Gateway', 
                message: 'Phản hồi từ dịch vụ AI không hợp lệ hoặc không đầy đủ.' 
            });
        }

        // Step 3: Gửi đối tượng JSON đã được phân tích và xác thực thành công cho client.
        // Mã phía client đã được thiết kế để xử lý cấu trúc đối tượng đầy đủ này.
        return response.status(200).json(responseData);

    } catch (error) {
        console.error('An unexpected error occurred in process-script handler:', error);
        return response.status(500).json({ 
            error: 'Unexpected Server Error', 
            details: error.message,
            attemptedPayload: payload
        });
    }
}
