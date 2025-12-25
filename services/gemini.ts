
import { GoogleGenAI, Type } from "@google/genai";

// process.env kontrolü eklendi
const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || "";
  } catch {
    return "";
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const analyzeNotes = async (
  imageData: string,
  userPrompt: string
) => {
  // Eğer API KEY yoksa hata fırlat
  if (!getApiKey()) {
    throw new Error("API Anahtarı bulunamadı. Lütfen environment ayarlarını kontrol edin.");
  }

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
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};
