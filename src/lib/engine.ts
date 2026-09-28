import type { LessonStep, NoteEvent } from './types';
export type Exercise = { index: number; correct: number; mistakes: number; complete: boolean; message: string; timing: number[] };
export const newExercise = (index = 0): Exercise => ({ index, correct: 0, mistakes: 0, complete: false, message: '', timing: [] });
export function evaluateNote(state: Exercise, event: NoteEvent, steps: LessonStep[], root: number, timing?: { start: number; bpm: number }): Exercise {
  if (event.type !== 'on' || state.complete || !steps[state.index]) return state;
  const expected = steps[state.index].notes.map(note => note + root - 60);
  if (!expected.includes(event.note)) return { ...state, mistakes: state.mistakes + 1, message: 'A little to the side. Find the highlighted key and try again.' };
  let offset: number | undefined;
  if (timing) {
    const beat = 60000 / timing.bpm;
    const target = timing.start + steps.slice(0, state.index).reduce((n, s) => n + s.beats, 0) * beat;
    offset = event.time - target;
    if (offset < -beat * 0.35) return { ...state, message: 'A little early. Release the key and listen for the beat.' };
  }
  const complete = state.index + 1 === steps.length;
  return { ...state, index: state.index + 1, correct: state.correct + 1, complete, timing: offset === undefined ? state.timing : [...state.timing, offset], message: complete ? 'Nicely played. You’ve reached the end of this practice.' : offset !== undefined && Math.abs(offset) > 180 ? 'Right note. Try bringing the next note closer to the click.' : 'That’s it. Now try the next note.' };
}
