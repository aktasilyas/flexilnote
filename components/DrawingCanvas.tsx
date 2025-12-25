
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Stroke, Tool, Point, Rect } from '../types';

interface DrawingCanvasProps {
  tool: Tool;
  color: string;
  strokes: Stroke[];
  setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  onStrokeEnd: (stroke: Stroke) => void;
  backgroundUrl?: string;
  pageDimensions: { width: number, height: number };
  scale: number;
  setScale: (scale: number) => void;
  offset: { x: number; y: number };
  setOffset: (offset: { x: number; y: number }) => void;
  onSelectionComplete: (rect: Rect | null) => void;
}

export interface DrawingCanvasHandle {
  captureSelection: (rect: Rect) => string | null;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(({
  tool, color, strokes, setStrokes, onStrokeEnd, backgroundUrl, pageDimensions, scale, setScale, offset, setOffset, onSelectionComplete
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Çizim katmanını ayırmak için gizli bir canvas kullanıyoruz
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const selectionStartPos = useRef<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const animationRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    captureSelection: (rect: Rect) => {
      const canvas = canvasRef.current;
      if (!canvas || !bgImageRef.current) return null;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;
      const captureScale = 3; 
      tempCanvas.width = rect.width * captureScale;
      tempCanvas.height = rect.height * captureScale;
      tempCtx.save();
      tempCtx.scale(captureScale, captureScale);
      tempCtx.translate(-rect.x, -rect.y);
      tempCtx.drawImage(bgImageRef.current, 0, 0, pageDimensions.width, pageDimensions.height);
      strokes.forEach(s => drawStrokeOnCtx(tempCtx, s));
      tempCtx.restore();
      return tempCanvas.toDataURL('image/png');
    }
  }));

  useEffect(() => {
    if (backgroundUrl) {
      const img = new Image();
      img.src = backgroundUrl;
      img.onload = () => { 
        bgImageRef.current = img; 
        renderAll(); 
      };
    }
  }, [backgroundUrl]);

  const drawStrokeOnCtx = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const points = stroke.points;
    if (points.length < 1) return;
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (stroke.tool === Tool.ERASER) {
      // destination-out: Çizim yapıldığı yerdeki mevcut içeriği siler (şeffaflaştırır)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 30 / scale;
      ctx.strokeStyle = 'rgba(0,0,0,1)'; 
    } else {
      ctx.globalCompositeOperation = stroke.tool === Tool.HIGHLIGHTER ? 'multiply' : 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = stroke.opacity;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Boyutları güncelle
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Offscreen canvas boyutlarını da güncelle
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      offscreenCanvasRef.current.width = canvas.width;
      offscreenCanvasRef.current.height = canvas.height;
    }

    const offscreenCanvas = offscreenCanvasRef.current;
    if (!offscreenCanvas) return;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    // 1. Ana tuvali temizle
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Arka Planı (PDF/Görsel) Çiz
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, pageDimensions.width, pageDimensions.height);
    }
    ctx.restore();

    // 3. Çizim Katmanını (Mürekkep) Hazırla
    offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    offscreenCtx.scale(dpr, dpr);
    offscreenCtx.translate(offset.x, offset.y);
    offscreenCtx.scale(scale, scale);

    // Tüm çizgileri offscreen katmanına çiz (Silgi burada destination-out yaparak sadece mürekkebi siler)
    strokes.forEach(s => drawStrokeOnCtx(offscreenCtx, s));
    if (currentStrokeRef.current) drawStrokeOnCtx(offscreenCtx, currentStrokeRef.current);

    // 4. Çizim Katmanını Ana Tuvalin Üstüne Yapıştır
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(offscreenCanvas, 0, 0);

    // 5. Seçim Çerçevesini (Kement) En Üste Çiz
    if (selectionRect) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);
      ctx.strokeStyle = '#4f46e5';
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -animationRef.current;
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      ctx.fillStyle = 'rgba(79, 70, 229, 0.05)';
      ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      ctx.restore();
    }
  }, [strokes, scale, offset, selectionRect, pageDimensions]);

  useEffect(() => {
    let frameId: number;
    const animate = () => {
      animationRef.current += 0.5;
      if (tool === Tool.SELECT && selectionRect) renderAll();
      animationRef.current %= 100;
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [tool, selectionRect, renderAll]);

  useEffect(() => { 
    renderAll(); 
  }, [renderAll]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const point: Point = {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
      pressure: e.pressure || 0.5
    };

    if (tool === Tool.SELECT) {
      setSelectionRect(null);
      selectionStartPos.current = point;
      onSelectionComplete(null);
    } else {
      currentStrokeRef.current = {
        id: Math.random().toString(36),
        points: [point],
        tool, 
        color, 
        width: (tool === Tool.PEN ? 2.5 : tool === Tool.HIGHLIGHTER ? 20 : 5) / (scale > 1 ? Math.sqrt(scale) : 1),
        opacity: tool === Tool.HIGHLIGHTER ? 0.3 : 1
      };
    }
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const point: Point = {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
      pressure: e.pressure || 0.5
    };

    if (tool === Tool.SELECT && selectionStartPos.current) {
      setSelectionRect({
        x: Math.min(point.x, selectionStartPos.current.x),
        y: Math.min(point.y, selectionStartPos.current.y),
        width: Math.abs(point.x - selectionStartPos.current.x),
        height: Math.abs(point.y - selectionStartPos.current.y)
      });
    } else if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(point);
    }
    renderAll();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDrawing && tool === Tool.SELECT && selectionRect) {
      onSelectionComplete(selectionRect);
    } else if (isDrawing && currentStrokeRef.current) {
      onStrokeEnd(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }
    setIsDrawing(false);
    selectionStartPos.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    renderAll();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="absolute inset-0 touch-none select-none"
      />
    </div>
  );
});

export default DrawingCanvas;
