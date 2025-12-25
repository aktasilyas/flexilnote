
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  if ((window as any).process?.env?.API_KEY) {
    return (window as any).process.env.API_KEY;
  }
  return "";
};

export const analyzeNotes = async (
  imageData: string,
  userPrompt: string
) => {
  const apiKey = getApiKey();
  
  if (!apiKey || apiKey === "") {
    throw new Error("API ANAHTARI EKSİK: Lütfen index.html içindeki API_KEY alanına anahtarınızı yapıştırın.");
  }

  const ai = new GoogleGenAI({ apiKey });

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
