import type { LessonStep } from '../lib/types';
import { noteName } from '../lib/types';
export function Timeline({ steps, index, complete, root }: { steps: LessonStep[]; index: number; complete: boolean; root: number }) {
  const phrase = steps[Math.min(index, steps.length - 1)]?.phrase;
  const start = phrase ? steps.findIndex(step => step.phrase === phrase) : 0;
  const visible = phrase ? steps.filter(step => step.phrase === phrase) : steps;
  const total = Math.max(4, visible.reduce((sum, s) => sum + s.beats, 0));
  let offset = 0;
  return <div className={`timeline ${phrase ? 'phrased' : ''}`} aria-label="Lesson note sequence">
    {phrase && <div className="phrase-caption"><span>Phrase {phrase} of {steps.at(-1)!.phrase}</span><span>{complete ? 'Song complete' : `Note ${index + 1} of ${steps.length}`}</span></div>}
    <div className="ruler">{Array.from({ length: Math.ceil(total) }, (_, i) => <span key={i} style={{ left: `${i / total * 100}%` }}>{i + 1}</span>)}</div>
    <div className="timeline-grid" style={{ backgroundSize: `${100 / total / 4}% 100%` }}>{visible.map((step, localIndex) => {
      const i = start + localIndex;
      const left = offset / total * 100; offset += step.beats;
      return <div key={i} className={`note-block ${i === index && !complete ? 'current' : ''} ${i < index ? 'done' : ''}`} style={{ left: `calc(${left}% + 2px)`, width: `calc(${step.beats / total * 100}% - 5px)` }} aria-label={`${noteName(step.notes[0] + root - 60)}${i === index ? ', next note' : ''}`}><span>{noteName(step.notes[0] + root - 60)}</span></div>;
    })}</div>
  </div>;
}
