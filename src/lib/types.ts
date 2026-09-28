export type Stage = 'learn' | 'listen' | 'try';
export type View = 'learn' | 'game' | 'free' | 'progress';
export type NoteEvent = { type: 'on' | 'off'; note: number; velocity: number; time: number; source: string; channel: number };
export type LessonStep = { notes: number[]; beats: number; fingers?: number[]; instruction: string; phrase?: number };
export type Lesson = { id: string; title: string; heading: string; description: string; explanation: string[]; steps: LessonStep[]; kind?: 'song'; credit?: string; rhythm?: boolean; staff?: boolean };
export type DeviceProfile = { inputId: string; outputId: string; low: number; high: number; calibrated: boolean; channel: number; octaveShift?: number; lightColour?: number };
export type SessionSummary = { lessonId: string; date: string; correct: number; mistakes: number; mode: 'wait' | 'rhythm' };
export type SavedState = { version: 1; lessonId: string; step: number; stage: Stage; volume: number; bpm: number; noteNames: boolean; guidance: boolean; devices: DeviceProfile[]; completed: string[]; sessions: SessionSummary[] };
export interface MidiInputLike { id: string; name: string | null; state: string; onmidimessage: ((event: { data: Uint8Array; timeStamp: number }) => void) | null }
export interface MidiOutputLike { id: string; name: string | null; state: string; send(data: number[]): void }
export interface MidiAccessLike { inputs: Map<string, MidiInputLike>; outputs: Map<string, MidiOutputLike>; onstatechange: (() => void) | null }
export const noteName = (note: number, octave = false) => ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][((note % 12) + 12) % 12] + (octave ? Math.floor(note / 12) - 1 : '');
export const isBlack = (note: number) => [1, 3, 6, 8, 10].includes(note % 12);
