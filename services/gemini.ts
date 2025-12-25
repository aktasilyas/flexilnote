
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  // Try getting from process.env (injected by some build tools or the environment)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  // Try getting from window shim we added in index.html
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
  
  if (!apiKey) {
    throw new Error("Gemini API Key bulunamadı! Lütfen bir API anahtarı ekleyin veya environment ayarlarını kontrol edin.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `Aşağıdaki öğrenci notunu veya doküman görselini analiz et. 
            Kullanıcı sorusu/bağlamı: "${userPrompt}". 
            
            ÖNEMLİ: Tüm yanıtlarını mutlaka TÜRKÇE olarak vermelisin. 
            Eğer görselde bir soru varsa adım adım çözümünü sun. 
            Eğer bir metin varsa ana fikirlerini ve önemli noktalarını açıkla.` },
            { inlineData: { mimeType: "image/png", data: imageData.split(',')[1] } }
          ]
        }
      ],
      config: {
        systemInstruction: "Sen profesyonel bir eğitim asistanısın. Öğrencilerin notlarını, sorularını ve dokümanlarını analiz edersin. Her zaman nazik, eğitici ve tamamen Türkçe yanıt verirsin.",
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING,
              description: "Dokümanın kısa bir özeti veya sorunun cevabı."
            },
            explanation: { 
              type: Type.STRING,
              description: "Konunun detaylı açıklaması veya çözüm mantığı."
            },
            steps: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Eğer bir problem çözülüyorsa, izlenen adımlar."
            }
          },
          required: ["summary", "explanation"]
        }
      }
    });

    const responseText = response.text || "{}";
    return JSON.parse(responseText);
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    // User friendly error message
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("Geçersiz API Anahtarı. Lütfen anahtarınızı kontrol edin.");
    }
    throw error;
  }
};
