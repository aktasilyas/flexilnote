
export enum Tool {
  PENCIL = 'pencil',
  PEN = 'pen',
  PEN_FINE = 'pen_fine',
  PEN_GEL = 'pen_gel',
  MARKER = 'marker',
  HIGHLIGHTER = 'highlighter',
  ERASER = 'eraser',
  SELECT = 'select'
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  tool: Tool;
  color: string;
  width: number;
  opacity: number;
}

export interface DrawingState {
  strokes: Stroke[];
  undoStack: Stroke[][];
  redoStack: Stroke[][];
}

export interface AIAnalysisResponse {
  summary: string;
  explanation: string;
  steps: string[];
}
