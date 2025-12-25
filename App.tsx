
import React, { useState, useCallback, useRef, useEffect } from 'react';
import DrawingCanvas, { DrawingCanvasHandle } from './components/DrawingCanvas';
import AIPanel from './components/AIPanel';
import DraggableToolbar from './components/DraggableToolbar';
import { Tool, Stroke, AIAnalysisResponse, Rect } from './types';
import { COLORS, ICONS } from './constants';
import { analyzeNotes } from './services/gemini';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.PEN);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [pageStrokesMap, setPageStrokesMap] = useState<Record<number, Stroke[]>>({});
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeSelection, setActiveSelection] = useState<Rect | null>(null);
  const [fileName, setFileName] = useState('Dökümanım');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasHandleRef = useRef<DrawingCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const centerPage = useCallback((pWidth: number, pHeight: number, currentScale: number) => {
    if (!containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const newOffsetX = (container.width - pWidth * currentScale) / 2;
    const newOffsetY = (container.height - pHeight * currentScale) / 2;
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, []);

  const renderPdfPage = useCallback(async (pdf: any, pageNum: number, currentScale: number) => {
    if (!pdf) return;
    const page = await pdf.getPage(pageNum);
    const dpr = 2; // High quality
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height * dpr;
    canvas.width = viewport.width * dpr;
    if (context) {
      context.scale(dpr, dpr);
      await page.render({ canvasContext: context, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      const originalViewport = page.getViewport({ scale: 1.0 });
      setPageDimensions({ width: originalViewport.width, height: originalViewport.height });
      setBackgroundUrl(dataUrl);
      centerPage(originalViewport.width, originalViewport.height, currentScale);
    }
  }, [centerPage]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > numPages || !pdfDoc) return;
    setPageStrokesMap(prev => ({ ...prev, [currentPage]: strokes }));
    setCurrentPage(newPage);
    setStrokes(pageStrokesMap[newPage] || []);
    setUndoStack([]);
    setRedoStack([]);
    await renderPdfPage(pdfDoc, newPage, scale);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setStrokes([]);
    setPageStrokesMap({});
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        // @ts-ignore
        const pdfjsLib = window.pdfjsLib;
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        await renderPdfPage(pdf, 1, 0.7);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const onStrokeEnd = useCallback((newStroke: Stroke) => {
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(prev => [...prev, newStroke]);
  }, [strokes]);

  const handleAiAnalyze = async (prompt: string, customImageData?: string): Promise<AIAnalysisResponse> => {
    setIsAiLoading(true);
    try {
      let imageData = customImageData;
      if (!imageData) {
        const canvas = document.querySelector('canvas');
        imageData = canvas?.toDataURL('image/png') || "";
      }
      return await analyzeNotes(imageData, prompt);
    } finally {
      setIsAiLoading(false);
    }
  };

  const askAiAboutSelection = () => {
    if (!activeSelection || !canvasHandleRef.current) return;
    const croppedImage = canvasHandleRef.current.captureSelection(activeSelection);
    if (croppedImage) {
      setIsAiOpen(true);
      (window as any).pendingSelectionImage = croppedImage;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F1F5F9] text-slate-900 overflow-hidden select-none font-sans">
      {/* Dynamic Sidebar */}
      <aside className={`transition-all duration-300 ease-in-out border-r border-slate-200 bg-white flex flex-col z-50 ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-lg text-indigo-600">FlexiNote</span>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
            <ICONS.Plus /> Yeni Döküman
          </button>
          <div className="pt-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">SAYFALAR</h3>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: numPages }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => handlePageChange(i + 1)}
                  className={`aspect-[3/4] rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 ${currentPage === i + 1 ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                >
                  <div className="w-10 h-12 bg-slate-200 rounded shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-500">{i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div className="relative flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white/50 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-4">
             {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>}
             <h1 className="text-sm font-bold text-slate-700">{fileName}</h1>
          </div>
          <div className="flex items-center gap-3">
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
             <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-lg">
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-1 px-2 hover:bg-white rounded text-xs font-bold">-</button>
                <span className="text-[10px] font-bold w-10 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(s + 0.1, 5))} className="p-1 px-2 hover:bg-white rounded text-xs font-bold">+</button>
             </div>
          </div>
        </header>

        <DraggableToolbar 
          activeTool={activeTool}
          setActiveTool={(t) => {setActiveTool(t); setActiveSelection(null);}}
          activeColor={activeColor}
          setActiveColor={setActiveColor}
          onUndo={() => {
            if (undoStack.length === 0) return;
            setRedoStack(prev => [...prev, strokes]);
            setStrokes(undoStack[undoStack.length - 1]);
            setUndoStack(prev => prev.slice(0, -1));
          }}
          onRedo={() => {
            if (redoStack.length === 0) return;
            setUndoStack(prev => [...prev, strokes]);
            setStrokes(redoStack[redoStack.length - 1]);
            setRedoStack(prev => prev.slice(0, -1));
          }}
          undoDisabled={undoStack.length === 0}
          redoDisabled={redoStack.length === 0}
          onAiToggle={() => setIsAiOpen(!isAiOpen)}
          isAiOpen={isAiOpen}
        />

        {activeSelection && (
          <div className="absolute z-[60] flex gap-2 p-1 bg-indigo-600 rounded-lg shadow-xl animate-fade-in" 
               style={{ left: `${(activeSelection.x + activeSelection.width/2) * scale + offset.x}px`, top: `${(activeSelection.y) * scale + offset.y - 50}px`, transform: 'translateX(-50%)' }}>
            <button onClick={askAiAboutSelection} className="px-4 py-2 text-white text-xs font-bold flex items-center gap-2">
              <ICONS.Brain /> AI'ya Sor
            </button>
          </div>
        )}

        <div ref={containerRef} className="flex-1 relative bg-[#E2E8F0] overflow-hidden shadow-inner">
             <DrawingCanvas
                ref={canvasHandleRef}
                tool={activeTool}
                color={activeColor}
                strokes={strokes}
                setStrokes={setStrokes}
                onStrokeEnd={onStrokeEnd}
                backgroundUrl={backgroundUrl}
                pageDimensions={pageDimensions}
                scale={scale}
                setScale={setScale}
                offset={offset}
                setOffset={setOffset}
                onSelectionComplete={setActiveSelection}
             />
        </div>
      </div>
      {isAiOpen && <AIPanel onAnalyze={handleAiAnalyze} isLoading={isAiLoading} />}
    </div>
  );
};

export default App;
