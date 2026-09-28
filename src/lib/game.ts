import type { LessonStep } from './types';

export type GameNote = { id: number; note: number; at: number; duration: number; finger?: number };
export type Judgment = 'Perfect' | 'Good' | 'Miss' | 'Try the next note';
export type Round = { results: Record<number, 'perfect' | 'good' | 'miss'>; score: number; hits: number; misses: number; wrong: number; combo: number; bestCombo: number; feedback: Judgment | ''; feedbackAt: number };
export const freshRound = (): Round => ({ results: {}, score: 0, hits: 0, misses: 0, wrong: 0, combo: 0, bestCombo: 0, feedback: '', feedbackAt: -Infinity });
export const hitWindow = (bpm: number) => Math.min(220, 60000 / bpm * 0.3);
export function songChart(steps: LessonStep[], bpm: number, root: number): GameNote[] {
  let at = 0;
  let id = 0;
  return steps.flatMap(step => {
    const duration = step.beats * 60000 / bpm;
    const notes = step.notes.map((note, i) => ({ id: id++, note: note + root - 60, at, duration, finger: step.fingers?.[i] }));
    at += duration;
    return notes;
  });
}
export function expireNotes(round: Round, chart: GameNote[], time: number, window: number): Round {
  const missed = chart.filter(n => round.results[n.id] === undefined && time > n.at + window);
  if (!missed.length) return round;
  const results = { ...round.results };
  missed.forEach(n => { results[n.id] = 'miss'; });
  return { ...round, results, misses: round.misses + missed.length, combo: 0, feedback: 'Miss', feedbackAt: time };
}
/** Called for fresh, normalized presses only. Holds/releases never earn another hit. */
export function hitNote(round: Round, chart: GameNote[], note: number, time: number, window: number): Round {
  if (time < -window) return round;
  const next = expireNotes(round, chart, time, window);
  const target = chart.filter(n => n.note === note && next.results[n.id] === undefined && Math.abs(time - n.at) <= window)
    .sort((a, b) => Math.abs(time - a.at) - Math.abs(time - b.at))[0];
  if (!target) return { ...next, combo: 0, wrong: next.wrong + 1, feedback: 'Try the next note', feedbackAt: time };
  const perfect = Math.abs(time - target.at) <= Math.min(90, window / 2);
  const combo = next.combo + 1;
  return { ...next, results: { ...next.results, [target.id]: perfect ? 'perfect' : 'good' }, hits: next.hits + 1,
    score: next.score + (perfect ? 100 : 70), combo, bestCombo: Math.max(next.bestCombo, combo), feedback: perfect ? 'Perfect' : 'Good', feedbackAt: time };
}

const RECORDS_KEY = 'octave-garden.game.v1';
export type GameRecords = Record<string, number>;
export function loadGameRecords(): GameRecords {
  try {
    const value = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null');
    if (value?.version !== 1 || !value.best || typeof value.best !== 'object' || Array.isArray(value.best)) return {};
    return Object.fromEntries(Object.entries(value.best).filter(([key, score]) => /^song-[a-z-]+:\d{2,3}$/.test(key) && Number.isInteger(score) && Number(score) >= 0 && Number(score) <= 100000).map(([key, score]) => [key, Number(score)]));
  } catch { return {}; }
}
export function saveGameRecord(key: string, score: number): { best: GameRecords; saved: boolean } {
  const best = { ...loadGameRecords() };
  best[key] = Math.max(best[key] ?? 0, score);
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify({ version: 1, best })); return { best, saved: true }; }
  catch { return { best, saved: false }; }
}
