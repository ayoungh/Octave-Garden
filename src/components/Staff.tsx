import { noteName } from '../lib/types';
export function Staff({ note }: { note: number }) {
  const positions: Record<number, number> = { 60: 102, 62: 96, 64: 90, 65: 84, 67: 78 };
  const y = positions[note] ?? 102;
  return <svg className="staff" viewBox="0 0 320 130" role="img" aria-label={`Treble staff showing ${noteName(note, true)}`}>
    {[42, 54, 66, 78, 90].map(line => <line key={line} x1="18" x2="300" y1={line} y2={line} stroke="currentColor" opacity=".35"/>)}
    <text x="24" y="93" fontSize="70" fontFamily="serif">𝄞</text>
    {note === 60 && <line x1="160" x2="200" y1="102" y2="102" stroke="currentColor"/>}
    <ellipse cx="180" cy={y} rx="10" ry="7" transform={`rotate(-20 180 ${y})`} fill="var(--accent)"/>
    <line x1="189" x2="189" y1={y} y2={y - 37} stroke="var(--accent)" strokeWidth="2"/>
  </svg>;
}
