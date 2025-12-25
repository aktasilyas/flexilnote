
import React, { useState, useRef } from 'react';
import { Tool } from '../types';
import { COLORS, ICONS } from '../constants';

interface DraggableToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  undoDisabled: boolean;
  redoDisabled: boolean;
  onAiToggle: () => void;
  isAiOpen: boolean;
}

const DraggableToolbar: React.FC<DraggableToolbarProps> = ({
  activeTool, setActiveTool, activeColor, setActiveColor,
  onUndo, onRedo, undoDisabled, redoDisabled, onAiToggle, isAiOpen
}) => {
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 200, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      setIsDragging(true);
      dragRef.current = { offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    setPos({ x: e.clientX - dragRef.current.offsetX, y: e.clientY - dragRef.current.offsetY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const tools = [
    { id: Tool.PEN, icon: <ICONS.Pen />, label: 'Kalem' },
    { id: Tool.HIGHLIGHTER, icon: <ICONS.Highlighter />, label: 'Vurgulayıcı' },
    { id: Tool.ERASER, icon: <ICONS.Eraser />, label: 'Silgi' },
    { id: Tool.SELECT, icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>, label: 'Seçim' },
  ];

  return (
    <div
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute z-[100] flex items-center bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl p-1 no-select ring-1 ring-black/5"
    >
      <div className="drag-handle w-8 h-10 flex flex-col gap-1 items-center justify-center cursor-move text-slate-300">
        <div className="w-1 h-1 rounded-full bg-slate-400" />
        <div className="w-1 h-1 rounded-full bg-slate-400" />
        <div className="w-1 h-1 rounded-full bg-slate-400" />
      </div>

      <div className="flex items-center gap-1 px-1 border-r border-slate-200/50">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 px-3 border-r border-slate-200/50">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setActiveColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${activeColor === c ? 'border-slate-800 scale-125' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1 pl-1 pr-2">
        <button onClick={onUndo} disabled={undoDisabled} className="p-2 text-slate-400 disabled:opacity-20"><ICONS.Undo /></button>
        <button onClick={onRedo} disabled={redoDisabled} className="p-2 text-slate-400 disabled:opacity-20"><ICONS.Redo /></button>
        <button 
          onClick={onAiToggle} 
          className={`ml-1 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isAiOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}
        >
          <ICONS.Brain />
        </button>
      </div>
    </div>
  );
};

export default DraggableToolbar;
