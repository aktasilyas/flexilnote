
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client exclusively with process.env.API_KEY as per the guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeNotes = async (
  imageData: string,
  userPrompt: string
) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `Aşağıdaki dokümanı analiz et. Kullanıcı sorusu: "${userPrompt}". Yanıtı her zaman Türkçe ver.` },
            { inlineData: { mimeType: "image/png", data: imageData.split(',')[1] } }
          ]
        }
      ],
      config: {
        systemInstruction: "Sen profesyonel bir eğitim asistanısın. Görselleri analiz ederek öğrencilere yardımcı olursun.",
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            explanation: { type: Type.STRING },
            steps: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "explanation"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI yanıt veremedi.");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("Girdiğiniz API Anahtarı geçersiz.");
    }
    throw new Error("AI Analizi sırasında bir hata oluştu: " + error.message);
  }
};
