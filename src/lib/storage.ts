import type { SavedState } from './types';
import { lessons, lessonById } from '../data/lessons';
// Keep the original key so the rename preserves existing browser progress.
export const STORAGE_KEY = 'first-notes.v1';
export const defaultState = (): SavedState => ({ version: 1, lessonId: 'find-c', step: 0, stage: 'learn', volume: 70, bpm: 60, noteNames: true, guidance: true, devices: [], completed: [], sessions: [] });
const validId = (id: unknown): id is string => typeof id === 'string' && lessons.some(lesson => lesson.id === id);
const integer = (n: unknown, min: number, max: number): n is number => Number.isInteger(n) && Number(n) >= min && Number(n) <= max;
export function decodeState(raw: string | null): SavedState {
  const defaults = defaultState();
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || value.version !== 1) return defaults;
    const id = validId(value.lessonId) ? value.lessonId : defaults.lessonId;
    return { ...defaults, lessonId: id,
      step: integer(value.step, 0, lessonById(id).steps.length - 1) ? value.step : 0,
      stage: ['learn', 'listen', 'try'].includes(value.stage) ? value.stage : 'learn',
      volume: integer(value.volume, 0, 100) ? value.volume : 70,
      bpm: integer(value.bpm, 40, 120) ? value.bpm : 60,
      noteNames: typeof value.noteNames === 'boolean' ? value.noteNames : true,
      guidance: typeof value.guidance === 'boolean' ? value.guidance : true,
      completed: Array.isArray(value.completed) ? [...new Set<string>(value.completed.filter(validId))] : [],
      sessions: Array.isArray(value.sessions) ? value.sessions.filter((s: Record<string, unknown>) => s && validId(s.lessonId) && typeof s.date === 'string' && Number.isFinite(Date.parse(s.date)) && integer(s.correct, 0, 1000) && integer(s.mistakes, 0, 10000) && ['wait', 'rhythm'].includes(String(s.mode))).slice(-100) : [],
      devices: Array.isArray(value.devices) ? value.devices.filter((d: Record<string, unknown>) => d && typeof d.inputId === 'string' && typeof d.outputId === 'string' && integer(d.low, 0, 127) && integer(d.high, Number(d.low) + 1, 127) && integer(d.channel, 0, 15)).slice(0, 2).map((d: Record<string, unknown>) => ({ inputId: d.inputId, outputId: d.outputId, low: d.low, high: d.high, channel: d.channel, lightColour: [11, 40, 127].includes(Number(d.lightColour)) ? Number(d.lightColour) : 11, octaveShift: integer(d.octaveShift, -10, 10) ? d.octaveShift : 0, calibrated: d.calibrated === true })) : [],
    } as SavedState;
  } catch { return defaults; }
}
export function loadState(): SavedState { try { return decodeState(localStorage.getItem(STORAGE_KEY)); } catch { return defaultState(); } }
export function saveState(state: SavedState): boolean { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; } }
