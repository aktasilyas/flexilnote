
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
  const [backgroundUrl, setBackgroundUrl] = useState<string>('https://picsum.photos/seed/math-note/1200/1600');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeSelection, setActiveSelection] = useState<Rect | null>(null);
  const [fileName, setFileName] = useState('New Document');
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  
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
    const dpr = window.devicePixelRatio || 1;
    const renderScale = Math.max(currentScale, 1) * dpr * 1.5; 
    const viewport = page.getViewport({ scale: renderScale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
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
    setUndoStack([]);
    setRedoStack([]);
    setScale(0.8);
    setActiveSelection(null);

    if (file.type === 'application/pdf') {
      try {
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
          await renderPdfPage(pdf, 1, 0.8);
        };
        reader.readAsArrayBuffer(file);
      } catch (err) {
        alert("PDF yüklenemedi.");
      }
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setPageDimensions({ width: img.width, height: img.height });
          setBackgroundUrl(img.src);
          setPdfDoc(null);
          setNumPages(1);
          setCurrentPage(1);
          centerPage(img.width, img.height, 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const onStrokeEnd = useCallback((newStroke: Stroke) => {
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(prev => [...prev, newStroke]);
  }, [strokes]);

  const undo = () => {
    if (undoStack.length === 0) return;
    setRedoStack(prev => [...prev, strokes]);
    setStrokes(undoStack[undoStack.length - 1]);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, strokes]);
    setStrokes(redoStack[redoStack.length - 1]);
    setRedoStack(prev => prev.slice(0, -1));
  };

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
    <div className="flex h-screen w-screen bg-[#F8FAFC] text-slate-900 overflow-hidden select-none font-sans">
      <aside className="w-16 md:w-20 border-r border-slate-200 bg-white flex flex-col items-center py-6 gap-6 z-50">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">FN</div>
        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all"><ICONS.Plus /></button>
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto w-full items-center pt-4">
          <button className="w-12 h-16 rounded-lg border-2 border-indigo-500 bg-indigo-50 shadow-sm flex flex-col items-center justify-center gap-1">
            <div className="w-8 h-10 bg-slate-200 rounded-sm"></div>
            <span className="text-[10px] font-bold text-slate-400">1</span>
          </button>
        </div>
      </aside>

      <div className="relative flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-4">
             <h1 className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{fileName}</h1>
             <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1 ml-2">
                <button disabled={currentPage <= 1} onClick={() => handlePageChange(currentPage - 1)} className="p-1 hover:bg-white rounded disabled:opacity-30"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap uppercase">Page {currentPage} / {numPages}</span>
                <button disabled={currentPage >= numPages} onClick={() => handlePageChange(currentPage + 1)} className="p-1 hover:bg-white rounded disabled:opacity-30"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf,image/*" />
             <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-1 hover:bg-white rounded transition-colors text-slate-500">-</button>
                <span className="text-[10px] font-bold w-12 text-center text-slate-600">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(s + 0.1, 10))} className="p-1 hover:bg-white rounded transition-colors text-slate-500">+</button>
             </div>
          </div>
        </header>

        {/* New Draggable Toolbar */}
        <DraggableToolbar 
          activeTool={activeTool}
          setActiveTool={(t) => {setActiveTool(t); setActiveSelection(null);}}
          activeColor={activeColor}
          setActiveColor={setActiveColor}
          onUndo={undo}
          onRedo={redo}
          undoDisabled={undoStack.length === 0}
          redoDisabled={redoStack.length === 0}
          onAiToggle={() => setIsAiOpen(!isAiOpen)}
          isAiOpen={isAiOpen}
        />

        {activeSelection && (
          <div className="absolute z-[60] -translate-x-1/2 flex gap-2 p-1 bg-indigo-600 rounded-lg shadow-xl animate-bounce" style={{ left: `${(activeSelection.x + activeSelection.width/2) * scale + offset.x}px`, top: `${(activeSelection.y) * scale + offset.y - 50}px` }}>
            <button onClick={askAiAboutSelection} className="px-3 py-1.5 text-white text-xs font-bold flex items-center gap-2"><ICONS.Brain /> Bu Kısmı AI'ya Sor</button>
          </div>
        )}

        <div ref={containerRef} className="flex-1 relative bg-slate-200 shadow-inner overflow-hidden">
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
