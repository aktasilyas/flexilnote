
import React, { useState, useRef, useEffect } from 'react';
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
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 200, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle')) {
      setIsDragging(true);
      dragRef.current = {
        offsetX: e.clientX - pos.x,
        offsetY: e.clientY - pos.y
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    setPos({
      x: e.clientX - dragRef.current.offsetX,
      y: e.clientY - dragRef.current.offsetY
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  const tools = [
    { id: Tool.PENCIL, icon: <ICONS.Pencil />, label: 'Karakalem' },
    { id: Tool.PEN, icon: <ICONS.Pen />, label: 'Dolma Kalem' },
    { id: Tool.PEN_FINE, icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m12 19 7-7 3 3-7 7-3-3Z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"/></svg>, label: 'İnce Uçlu' },
    { id: Tool.PEN_GEL, icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><circle cx="12" cy="12" r="2"/></svg>, label: 'Jel Kalem' },
    { id: Tool.MARKER, icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>, label: 'Marker' },
    { id: Tool.HIGHLIGHTER, icon: <ICONS.Highlighter />, label: 'Fosforlu' },
    { id: Tool.ERASER, icon: <ICONS.Eraser />, label: 'Silgi' },
    { id: Tool.SELECT, icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>, label: 'Seçim' },
  ];

  return (
    <div
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`absolute z-[100] transition-all duration-300 ease-out flex items-center bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-1.5 no-select ${isCollapsed ? 'w-14 overflow-hidden' : 'max-w-fit'}`}
    >
      {/* Drag Handle */}
      <div className="drag-handle w-6 h-10 flex flex-col gap-1 items-center justify-center cursor-move text-slate-300 hover:text-slate-400 transition-colors">
        <div className="w-1 h-1 rounded-full bg-current" />
        <div className="w-1 h-1 rounded-full bg-current" />
        <div className="w-1 h-1 rounded-full bg-current" />
      </div>

      <div className={`flex items-center gap-1 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100'}`}>
        {/* Tool Section */}
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-100">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === t.id ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Color Section */}
        <div className="flex items-center gap-1.5 px-3 border-r border-slate-100">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-90 ${activeColor === c ? 'border-slate-800 scale-125 shadow-sm' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Undo/Redo/AI Section */}
        <div className="flex items-center gap-1 pl-2">
          <button onClick={onUndo} disabled={undoDisabled} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-20"><ICONS.Undo /></button>
          <button onClick={onRedo} disabled={redoDisabled} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-20"><ICONS.Redo /></button>
          <button 
            onClick={onAiToggle} 
            className={`ml-2 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isAiOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
          >
            <ICONS.Brain /> AI
          </button>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`ml-1 w-8 h-10 flex items-center justify-center text-slate-300 hover:text-indigo-500 transition-colors ${isCollapsed ? 'absolute left-6' : ''}`}
      >
        {isCollapsed ? 
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg> : 
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        }
      </button>
      
      {/* Active tool indicator when collapsed */}
      {isCollapsed && (
        <div className="absolute left-1.5 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg pointer-events-none">
          {tools.find(t => t.id === activeTool)?.icon}
        </div>
      )}
    </div>
  );
};

export default DraggableToolbar;
