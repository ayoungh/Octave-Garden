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
  {
    id: 'song-au-clair-de-la-lune', kind: 'song', title: 'Au clair de la lune', heading: 'Au clair de la lune',
    description: 'A short version of the French folk tune using just C, D, and E.',
    credit: 'Traditional French melody · simplified opening',
    explanation: ['Rest fingers 1, 2, and 3 on C, D, and E. Begin with three separate presses of C.', 'Let E and D ring for two beats, then return to shorter notes. Lift between repeated notes.', 'This short arrangement repeats the opening melody. Learn one phrase, then enjoy recognising it the second time.'],
    steps: phrases([[C, C, C, D, [E, 2], [D, 2]], [C, E, D, D, [C, 4]], [C, C, C, D, [E, 2], [D, 2]], [C, E, D, D, [C, 4]]]),
  },
  {
    id: 'song-lightly-row', kind: 'song', title: 'Lightly Row', heading: 'Lightly Row',
    description: 'Practise small skips and a smooth climb in this short folk melody.',
    credit: 'Traditional melody · simplified opening',
    explanation: ['Place one finger on each white key from C to G. Begin on G with your little finger, then skip down to E.', 'The opening pairs G with E, then F with D. Keep your hand relaxed instead of reaching with one finger.', 'The second phrase climbs C–D–E–F–G. Listen for the different ending when the opening returns.'],
    steps: phrases([[G, E, [E, 2], F, D, [D, 2]], [C, D, E, F, G, G, [G, 2]], [G, E, [E, 2], F, D, [D, 2]], [C, E, G, G, [C, 4]]]),
  },
  {
    id: 'song-jingle-bells', kind: 'song', title: 'Jingle Bells', heading: 'Jingle Bells',
    description: 'Play the familiar chorus, with repeated E notes and two different endings.',
    credit: 'James Lord Pierpont · simplified chorus',
    explanation: ['Start on E with finger 3. Keep all five fingers resting over C–G.', 'Release each repeated E and F. The tune also skips from E up to G, then down to C: use fingers 3, 5, and 1.', 'The two halves begin the same way but end differently. Learn the note order slowly, then try Play mode at 40 or 60 BPM.'],
    steps: phrases([[E, E, [E, 2], E, E, [E, 2]], [E, G, [C, 1.5], [D, 0.5], [E, 4]], [F, F, [F, 1.5], [F, 0.5], F, E, E, [E, 0.5], [E, 0.5]], [E, D, D, E, [D, 2], [G, 2]], [E, E, [E, 2], E, E, [E, 2]], [E, G, [C, 1.5], [D, 0.5], [E, 4]], [F, F, [F, 1.5], [F, 0.5], F, E, E, [E, 0.5], [E, 0.5]], [G, G, F, D, [C, 4]]]),
  },
  {
    id: 'song-when-the-saints', kind: 'song', title: 'When the Saints Go Marching In', heading: 'When the Saints Go Marching In',
    description: 'A familiar marching tune with an upward opening and longer landing notes.',
    credit: 'Traditional melody · simplified rhythm',
    explanation: ['Keep your thumb on C and little finger on G. Begin C–E–F–G using fingers 1, 3, 4, and 5.', 'Let the long G ring while you count. This version uses a steady, simplified rhythm; start slowly and follow the example.', 'The opening returns three times. Later, watch for repeated notes and practise each phrase separately before playing the whole tune.'],
    steps: phrases([[C, E, F, [G, 5]], [C, E, F, [G, 5]], [C, E, F, [G, 2], [E, 2], [C, 2], [E, 2], [D, 5]], [E, E, [D, 2], [C, 3], C, [E, 2], [G, 2], G, [F, 3]], [[E, 2], [F, 2], [G, 2], [E, 2], [C, 2], [D, 2], [C, 4]]]),
  },
];
