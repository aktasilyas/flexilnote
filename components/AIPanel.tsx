
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { AIAnalysisResponse } from '../types';

interface AIPanelProps {
  onAnalyze: (prompt: string, customImageData?: string) => Promise<AIAnalysisResponse>;
  isLoading: boolean;
}

const AIPanel: React.FC<AIPanelProps> = ({ onAnalyze, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<{ prompt: string; result: AIAnalysisResponse; hasImage?: boolean }[]>([]);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  useEffect(() => {
    const checkPending = () => {
      const img = (window as any).pendingSelectionImage;
      if (img) {
        setPendingImage(img);
        (window as any).pendingSelectionImage = null;
      }
    };
    checkPending();
    const timer = setInterval(checkPending, 500);
    return () => clearInterval(timer);
  }, []);

  const handleAsk = async () => {
    if (!prompt.trim() && !pendingImage) return;
    
    const finalPrompt = prompt || "Bu seçili alanı açıkla veya buradaki soruyu çöz.";
    try {
      const result = await onAnalyze(finalPrompt, pendingImage || undefined);
      setHistory(prev => [{ prompt: finalPrompt, result, hasImage: !!pendingImage }, ...prev]);
      setPrompt('');
      setPendingImage(null);
    } catch (e) {
      alert("Yapay zeka analizi başarısız oldu. Lütfen internet bağlantınızı veya API anahtarınızı kontrol edin.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-md shadow-2xl border-l border-gray-200 w-80 md:w-96 no-select">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ICONS.Brain /> FlexiStudy AI
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {pendingImage && (
          <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200 animate-pulse">
            <p className="text-[10px] font-bold text-indigo-500 uppercase mb-1">Seçilen Alan Analiz Bekliyor</p>
            <img src={pendingImage} className="w-full h-24 object-cover rounded border border-indigo-100" />
            <button onClick={() => setPendingImage(null)} className="text-[10px] text-red-500 mt-1 hover:underline">Vazgeç</button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-40 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <p className="text-sm text-gray-500 font-medium">Analiz ediliyor...</p>
          </div>
        )}

        {history.map((item, i) => (
          <div key={i} className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <div className="flex justify-between items-start">
              <p className="font-bold text-sm text-indigo-900">Soru: {item.prompt}</p>
              {item.hasImage && <span className="px-1.5 py-0.5 bg-indigo-200 text-[8px] rounded text-indigo-700 font-bold">GÖRSEL</span>}
            </div>
            <div className="space-y-2">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{item.result.summary}</p>
              {item.result.explanation && (
                <div className="pt-2 border-t border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">Detaylı Açıklama</p>
                  <p className="text-sm text-gray-600 italic">{item.result.explanation}</p>
                </div>
              )}
              {item.result.steps && item.result.steps.length > 0 && (
                <div className="pt-2">
                   <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Adım Adım Çözüm</p>
                   <ul className="space-y-1.5">
                    {item.result.steps.map((step, si) => (
                      <li key={si} className="text-xs text-gray-600 flex gap-2">
                        <span className="font-bold text-indigo-500">{si + 1}.</span> {step}
                      </li>
                    ))}
                   </ul>
                </div>
              )}
            </div>
          </div>
        ))}

        {!isLoading && history.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm italic">Henüz bir soru sormadınız. Sayfada bir yer seçin veya aşağıya bir soru yazın.</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={pendingImage ? "Seçilen görselle ilgili ne sormak istersin?" : "Sorunu buraya yaz..."}
            className="w-full p-3 pr-12 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-24"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAsk())}
          />
          <button
            onClick={handleAsk}
            disabled={isLoading || (!prompt.trim() && !pendingImage)}
            className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPanel;
