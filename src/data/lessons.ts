import type { Lesson, LessonStep } from '../lib/types';
import { songs } from './songs';
import { isPianoNote } from '../lib/pianoRange';
const sequence = (notes: number[], fingers?: number[]): LessonStep[] => notes.map((note, i) => ({ notes: [note], beats: 1, fingers: fingers ? [fingers[i]] : undefined, instruction: '' }));
export const firstSteps: Lesson[] = [
  { id: 'find-c', title: 'Find C', heading: 'Find your first C', description: 'C sits just to the left of two black keys.', explanation: ['Look for a group of two black keys. The white key immediately to their left is C.', 'Let your shoulders relax. Curve your fingers gently, with your right thumb resting on C.', 'Your thumb is finger 1. Play C, let go, then play it again. There is no rush.'], steps: sequence([60, 60, 60], [1, 1, 1]) },
  { id: 'meet-de', title: 'Meet D and E', heading: 'Three notes, a little melody', description: 'D and E are the next two white keys to the right of C.', explanation: ['Keep your thumb on C. Rest your index finger on D and your middle finger on E.', 'We call those fingers 1, 2, and 3. Use one finger for each note.', 'Listen to C–D–E, then try the pattern yourself. Lift each finger before the next note.'], steps: sequence([60, 62, 64, 64, 62, 60], [1, 2, 3, 3, 2, 1]) },
  { id: 'five-fingers', title: 'Five fingers', heading: 'Give every finger a note', description: 'Let your right hand rest comfortably over C, D, E, F, and G.', explanation: ['Your thumb is 1, index 2, middle 3, ring 4, and little finger 5.', 'Place one finger on each white key from C to G. Keep your wrist loose and avoid stretching.', 'Walk up and back down. A small, even sound matters more than speed.'], steps: sequence([60, 62, 64, 65, 67, 65, 64, 62, 60], [1, 2, 3, 4, 5, 4, 3, 2, 1]) },
  { id: 'steady-beats', title: 'Steady beats', heading: 'Find a steady pulse', description: 'Play one C on each beat. Release the key between notes.', explanation: ['A beat is a steady pulse. At 60 beats per minute, there is one beat each second.', 'First try the notes at your own pace. When ready, choose With a beat.', 'After four count-in beats, play C on each click. You can slow the tempo down; timing feedback is there to help, not to rush you.'], steps: sequence([60, 60, 60, 60, 60, 60, 60, 60], [1, 1, 1, 1, 1, 1, 1, 1]), rhythm: true },
  { id: 'first-melody', title: 'First melody', heading: 'Make a little music', description: 'A small melody made from the five notes you already know.', explanation: ['This melody is called First Light. It uses only C, D, E, F, and G.', 'Listen for the shape: a little climb, a gentle turn, and a return home to C.', 'Try it one note at a time. The longer final note gives the melody room to settle.'], steps: sequence([60, 62, 64, 67, 65, 64, 62, 60], [1, 2, 3, 5, 4, 3, 2, 1]).map((step, i) => ({ ...step, beats: i === 7 ? 2 : 1 })) },
  { id: 'read-notes', title: 'Read notes', heading: 'Meet the musical staff', description: 'A note’s height on the staff tells you which pitch to play.', explanation: ['The treble staff has five lines. Notes sit on a line or in the space between lines.', 'Middle C sits on a short extra line below the staff. D is just above it, and E is on the bottom line.', 'Follow C, D, and E on the staff. These written notes can be practised in another octave when your keyboard has a different range.'], steps: sequence([60, 62, 64, 62, 60], [1, 2, 3, 2, 1]), staff: true },
];
export { songs };
export const lessons: Lesson[] = [...firstSteps, ...songs];
export const lessonById = (id: string) => lessons.find(lesson => lesson.id === id) ?? lessons[0];
/** Fit the five-finger course into the calibrated keyboard without folding pitches. */
export function lessonRoot(low: number, high: number): number | null {
  const candidates = Array.from({ length: 11 }, (_, i) => i * 12).filter(c => c >= low && c + 7 <= high && isPianoNote(c) && isPianoNote(c + 7));
  return candidates.sort((a, b) => Math.abs(a - 60) - Math.abs(b - 60))[0] ?? null;
}
