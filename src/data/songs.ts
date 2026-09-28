import type { Lesson, LessonStep } from '../lib/types';
const fingers: Record<number, number> = { 60: 1, 62: 2, 64: 3, 65: 4, 67: 5 };
type BeatNote = number | [number, number];
function phrases(lines: BeatNote[][]): LessonStep[] {
  return lines.flatMap((line, phrase) => line.map(value => {
    const [note, beats] = typeof value === 'number' ? [value, 1] : value;
    return { notes: [note], beats, fingers: [fingers[note]], phrase: phrase + 1, instruction: beats > 1 ? `Let this note ring for ${beats} beats in the example.` : 'Lift your finger before playing the next note.' };
  }));
}
const C = 60, D = 62, E = 64, F = 65, G = 67;
export const songs: Lesson[] = [
  {
    id: 'song-hot-cross-buns', kind: 'song', title: 'Hot Cross Buns', heading: 'Hot Cross Buns',
    description: 'Three notes are enough to make a song. Start with E, D, and C.',
    credit: 'Traditional melody · beginner arrangement',
    explanation: ['Rest your thumb on C, index finger on D, and middle finger on E.', 'The opening walks down E–D–C. Later, release and play C four times, then do the same on D.', 'Listen for the longer notes. In Try it, we wait for every correct press, so you can learn the tune at your own pace.'],
    steps: phrases([[[E, 2], [D, 2], [C, 4]], [[E, 2], [D, 2], [C, 4]], [C, C, C, C, D, D, D, D], [[E, 2], [D, 2], [C, 4]]]),
  },
  {
    id: 'song-mary', kind: 'song', title: 'Mary Had a Little Lamb', heading: 'Mary Had a Little Lamb',
    description: 'A gentle tune with repeated notes and a small reach up to G.',
    credit: 'Traditional nursery melody · beginner arrangement',
    explanation: ['Place your right hand over C–G, with one finger on each white key.', 'Start on E with finger 3. Use your little finger for G and lift between repeated notes.', 'Follow one phrase at a time. Some phrases return: notice what feels familiar as you play.'],
    steps: phrases([[E, D, C, D, E, E, [E, 2]], [D, D, [D, 2], E, G, [G, 2]], [E, D, C, D, E, E, E, E], [D, D, E, D, [C, 4]]]),
  },
  {
    id: 'song-ode-to-joy', kind: 'song', title: 'Ode to Joy', heading: 'Ode to Joy',
    description: 'The opening theme, arranged for your right hand using C, D, E, F, and G.',
    credit: 'Ludwig van Beethoven · simplified opening theme',
    explanation: ['Keep your thumb on C and your little finger on G. The theme begins on E with finger 3.', 'Walk up to G, then back down. The second half starts the same way but finishes on C.', 'Listen to the short note near each phrase ending. Try it checks the order of notes; you can add the rhythm once the melody feels comfortable.'],
    steps: phrases([[E, E, F, G, G, F, E, D], [C, C, D, E, [E, 1.5], [D, 0.5], [D, 2]], [E, E, F, G, G, F, E, D], [C, C, D, E, [D, 1.5], [C, 0.5], [C, 2]]]),
  },
];
