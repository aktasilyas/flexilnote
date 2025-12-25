
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
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPanPoint = useRef<{ x: number, y: number } | null>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const selectionStartPos = useRef<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);

  useImperativeHandle(ref, () => ({
    captureSelection: (rect: Rect) => {
      const canvas = canvasRef.current;
      if (!canvas || !bgImageRef.current) return null;
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;
      const captureScale = 2;
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
      img.onload = () => { bgImageRef.current = img; renderAll(); };
    }
  }, [backgroundUrl]);

  const drawStrokeOnCtx = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const points = stroke.points;
    if (points.length < 1) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (stroke.tool === Tool.ERASER) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 40 / scale;
      ctx.strokeStyle = 'rgba(0,0,0,1)'; 
    } else {
      ctx.globalCompositeOperation = stroke.tool === Tool.HIGHLIGHTER ? 'multiply' : 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = stroke.opacity;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // Değişken kalınlık (Basınç desteği simülasyonu)
    if (points.length < 3) {
      points.forEach(p => ctx.lineTo(p.x, p.y));
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
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
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    if (!offscreenCanvasRef.current || offscreenCanvasRef.current.width !== canvas.width || offscreenCanvasRef.current.height !== canvas.height) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = canvas.width;
      offscreenCanvasRef.current.height = canvas.height;
    }

    const offCtx = offscreenCanvasRef.current.getContext('2d');
    if (!offCtx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    offCtx.setTransform(1, 0, 0, 1, 0, 0);
    offCtx.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);

    ctx.scale(dpr, dpr);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    if (bgImageRef.current && pageDimensions.width > 0) {
      ctx.drawImage(bgImageRef.current, 0, 0, pageDimensions.width, pageDimensions.height);
    }
    ctx.restore();

    offCtx.scale(dpr, dpr);
    offCtx.translate(offset.x, offset.y);
    offCtx.scale(scale, scale);
    strokes.forEach(s => drawStrokeOnCtx(offCtx, s));
    if (currentStrokeRef.current) drawStrokeOnCtx(offCtx, currentStrokeRef.current);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(offscreenCanvasRef.current, 0, 0, rect.width * dpr, rect.height * dpr, 0, 0, rect.width, rect.height);
    ctx.restore();

    if (selectionRect) {
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);
      ctx.strokeStyle = '#4f46e5';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2 / scale;
      ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      ctx.restore();
    }
  }, [strokes, scale, offset, selectionRect, pageDimensions]);

  useEffect(() => { renderAll(); }, [renderAll]);

  // Mobil Stylus ve Basınç Hassasiyeti İçin Pointer API Kullanımı
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    
    // Shift tuşu veya iki parmakla kaydırma (Pan) kontrolü
    if (e.buttons === 4 || e.pointerType === 'touch' && e.pressure === 0) {
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const rect = canvasRef.current!.getBoundingClientRect();
    const point: Point = {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
      pressure: e.pressure || 0.5 // Apple Pencil basıncını yakalar
    };

    if (tool === Tool.SELECT) {
      setSelectionRect(null);
      selectionStartPos.current = point;
      onSelectionComplete(null);
    } else {
      let width = 2;
      let opacity = 1.0;
      switch(tool) {
        case Tool.PENCIL: width = 1.2; opacity = 0.7; break;
        case Tool.PEN: width = 2.5; break;
        case Tool.PEN_FINE: width = 1.0; break;
        case Tool.PEN_GEL: width = 3.5; break;
        case Tool.MARKER: width = 8.0; break;
        case Tool.HIGHLIGHTER: width = 24.0; opacity = 0.4; break;
      }
      currentStrokeRef.current = {
        id: Math.random().toString(36),
        points: [point],
        tool, color, width: (width * (point.pressure * 1.5)) / (scale > 1.5 ? Math.pow(scale, 0.25) : 1),
        opacity
      };
    }
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (lastPanPoint.current) {
      setOffset({ x: offset.x + (e.clientX - lastPanPoint.current.x), y: offset.y + (e.clientY - lastPanPoint.current.y) });
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }
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
    lastPanPoint.current = null;
    selectionStartPos.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomSpeed = 0.0015;
      const newScale = Math.min(Math.max(scale - e.deltaY * zoomSpeed, 0.1), 10);
      const rect = canvasRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
      const worldX = (mouseX - offset.x) / scale, worldY = (mouseY - offset.y) / scale;
      setScale(newScale);
      setOffset({ x: mouseX - worldX * newScale, y: mouseY - worldY * newScale });
    } else {
      setOffset({ x: offset.x - e.deltaX, y: offset.y - e.deltaY });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#F1F3F4]">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="absolute inset-0 touch-none select-none"
      />
    </div>
  );
});

export default DrawingCanvas;
