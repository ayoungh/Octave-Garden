import { useRef } from 'react';
import { isBlack, noteName } from '../lib/types';
type Props = { low: number; high: number; held: number[]; targets: number[]; fingers?: number[]; showNames: boolean; onDown: (note: number, source: string) => void; onUp: (note: number, source: string) => void };
export function Keyboard({ low, high, held, targets, fingers, showNames, onDown, onUp }: Props) {
  const pointerNotes = useRef(new Map<number, number>());
  const notes = Array.from({ length: high - low + 1 }, (_, i) => i + low);
  const whites = notes.filter(note => !isBlack(note));
  function key(note: number, black: boolean) {
    const target = targets.includes(note);
    const index = targets.indexOf(note);
    const whiteBefore = notes.filter(n => n < note && !isBlack(n)).length;
    const style = black ? { left: `${(whiteBefore / whites.length) * 100}%`, width: `${65 / whites.length}%` } : undefined;
    return <button key={note} className={`piano-key ${black ? 'black-key' : 'white-key'} ${target ? 'target' : ''} ${held.includes(note) ? 'pressed' : ''}`} style={style}
      aria-label={`Play ${noteName(note, true)}`} aria-pressed={held.includes(note)}
      onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pointerNotes.current.set(event.pointerId, note); onDown(note, `pointer-${event.pointerId}`); }}
      onPointerUp={event => { const n = pointerNotes.current.get(event.pointerId); if (n !== undefined) onUp(n, `pointer-${event.pointerId}`); pointerNotes.current.delete(event.pointerId); }}
      onLostPointerCapture={event => { const n = pointerNotes.current.get(event.pointerId); if (n !== undefined) onUp(n, `pointer-${event.pointerId}`); pointerNotes.current.delete(event.pointerId); }}
      onKeyDown={event => { if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) { event.preventDefault(); onDown(note, `button-${note}`); } }}
      onKeyUp={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onUp(note, `button-${note}`); } }}
      onBlur={() => onUp(note, `button-${note}`)}>
      {(showNames || target) && <span className="key-name">{noteName(note)}</span>}
      {target && fingers?.[index] && <span className="finger-number">{fingers[index]}</span>}
    </button>;
  }
  return <div className="keyboard-scroll"><div className={`piano ${notes.length > 30 ? 'wide-piano' : ''}`} role="group" aria-label={`${notes.length}-key piano, ${noteName(low, true)} to ${noteName(high, true)}`}>
    <div className="white-keys">{whites.map(note => key(note, false))}</div>{notes.filter(isBlack).map(note => key(note, true))}
  </div></div>;
}
