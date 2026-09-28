import { useMemo, useState } from 'react';
import { Gamepad2, Pause, Play, RotateCcw, Trophy } from 'lucide-react';
import { songs } from '../data/songs';
import { isBlack, noteName } from '../lib/types';
import { loadGameRecords, saveGameRecord } from '../lib/game';
import { useGame } from '../useGame';
import type { GameBridge } from '../useGame';
import { Keyboard } from './Keyboard';

type Props = {
  root: number; low: number; high: number; showNames: boolean; held: number[]; available: boolean; songId: string; bridge: GameBridge;
  startAudio: () => Promise<boolean>; silence: () => void; beat: (accent: boolean) => void; audioError: string;
  onDown: (note: number, source: string) => void; onUp: (note: number, source: string) => void;
  openSetup: () => void; learn: (id: string) => void;
};
export function GameMode(props: Props) {
  const songId = props.songId;
  const [bpm, setBpm] = useState(60);
  const [records, setRecords] = useState(loadGameRecords);
  const [storageError, setStorageError] = useState(false);
  const song = songs.find(s => s.id === songId)!;
  const recordKey = `${songId}:${bpm}`;
  const game = useGame(song, bpm, props.root, { start: props.startAudio, silence: props.silence, beat: props.beat }, props.bridge, round => {
    const result = saveGameRecord(recordKey, round.score); setRecords(result.best); setStorageError(!result.saved);
  });
  const active = game.phase === 'running' || game.phase === 'paused' || game.phase === 'loading';
  const whites = useMemo(() => Array.from({ length: props.high - props.low + 1 }, (_, i) => props.low + i).filter(n => !isBlack(n)), [props.low, props.high]);
  const visibleTime = game.phase === 'idle' ? -game.lead * 0.65 : game.elapsed;
  const near = game.chart.find(n => game.round.results[n.id] === undefined && n.at >= game.elapsed - 220);
  const targets = game.phase === 'running' && near && near.at - game.elapsed < 60000 / bpm ? [near.note] : [];
  const progress = Math.max(0, Math.min(100, game.elapsed / game.end * 100));
  const feedback = game.elapsed - game.round.feedbackAt < 900 ? game.round.feedback : '';
  return <section className="game-mode" aria-label="Song game">
    <div className="game-heading"><div><span className="eyebrow"><Gamepad2 size={16}/>PLAY ALONG</span><h1>{song.title}</h1><p>Play each note as its leading edge reaches the glowing line.</p></div><span className="game-best"><Trophy size={16}/>Best at {bpm} BPM <strong>{records[recordKey] ?? 0}</strong></span></div>
    <div className="game-toolbar">
      <label>Speed<select aria-label="Game speed" value={bpm} disabled={active} onChange={e => setBpm(Number(e.target.value))}>{[40, 50, 60, 70, 80, 90, 100, 110, 120].map(n => <option key={n} value={n}>{n} BPM{n === 60 ? ' · Beginner' : ''}</option>)}</select></label>
      <label className="game-click"><input type="checkbox" checked={game.click} onChange={e => game.setClick(e.target.checked)}/>Beat click</label>
      <div className="game-actions">
        {game.phase === 'running' ? <button onClick={game.pause}><Pause size={16}/>Pause game</button> : game.phase === 'paused' ? <button className="primary" onClick={game.resume} disabled={!props.available}><Play size={16}/>Resume game</button> : <button className="primary" onClick={() => void game.start()} disabled={!props.available || game.phase === 'loading'}><Play size={16}/>{game.phase === 'loading' ? 'Preparing piano…' : game.phase === 'finished' ? 'Play again' : 'Start song'}</button>}
        {active && <button onClick={game.reset} aria-label="Reset game"><RotateCcw size={16}/></button>}
      </div>
    </div>
    {!props.available && <p className="notice" role="status">Check the keyboard range before playing. <button className="text-button" onClick={props.openSetup}>Open keyboard setup</button></p>}
    {props.audioError && <p className="error-message" role="alert">{props.audioError}</p>}
    <div className="game-stats"><div><span>SCORE</span><strong>{game.round.score}</strong></div><div><span>STREAK</span><strong>{game.round.combo}<small> notes</small></strong></div><div><span>HIT</span><strong>{game.round.hits}<small> / {game.chart.length}</small></strong></div><div className={`game-feedback ${feedback === 'Perfect' ? 'perfect' : ''}`} role="status">{feedback || (game.phase === 'running' && game.elapsed < 0 ? 'Get ready…' : 'Every note is another chance.')}</div></div>
    <div className="game-progress" role="progressbar" aria-label="Song progress" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }}/></div>
    <div className="game-board-scroll"><div className={`game-board ${props.high - props.low + 1 > 30 ? 'wide-game-board' : ''}`}>
      <div className="note-highway" aria-label="Notes moving toward the keyboard">
        <div className="game-lanes" aria-hidden="true">{whites.map(note => <div key={note} className={props.held.includes(note) ? 'lit-lane' : ''}><span>{noteName(note)}</span></div>)}</div>
        <div className="falling-notes" aria-hidden="true">{game.chart.map(n => {
          const delta = n.at - visibleTime;
          if (delta > game.lead * 1.2 || delta < -n.duration - 500) return null;
          const index = whites.indexOf(n.note);
          if (index < 0) return null;
          const bottom = delta / game.lead * 100;
          const result = game.round.results[n.id];
          return <div key={n.id} className={`falling-note ${result ?? ''}`} style={{ left: `${index / whites.length * 100}%`, width: `${100 / whites.length}%`, bottom: `${bottom}%`, height: `${Math.max(7, n.duration * 0.82 / game.lead * 100)}%` }}><span>{noteName(n.note)}</span><small>{n.finger}</small></div>;
        })}</div>
        <div className="hit-line"><span>PLAY HERE</span></div>
        {(game.phase === 'idle' || game.phase === 'loading' || game.phase === 'paused' || game.phase === 'finished' || game.elapsed < 0) && <div className={`game-overlay ${game.phase === 'running' ? 'counting' : ''}`}>
          {game.phase === 'running' ? <><strong className="game-count">{Math.max(1, Math.ceil(-game.elapsed / (60000 / bpm)))}</strong><span>Find {noteName(game.chart[0].note)} · finger {game.chart[0].finger}</span></> : game.phase === 'finished' ? <><Trophy size={28}/><h2>{game.round.hits === game.chart.length ? 'You found every note!' : 'Song finished. Keep growing.'}</h2><p>{game.round.hits} of {game.chart.length} notes · {game.round.misses} missed · {game.round.wrong} extra presses</p><p>Best streak: {game.round.bestCombo} · Score: {game.round.score}</p></> : <><Gamepad2 size={30}/><h2>{game.phase === 'paused' ? 'Take a breath.' : game.phase === 'loading' ? 'Getting the piano ready…' : song.title}</h2><p>{game.phase === 'paused' ? 'Your song is paused. Resume when you’re ready.' : 'A four-beat count-in, then it’s your turn.'}</p></>}
        </div>}
      </div>
      <Keyboard low={props.low} high={props.high} held={props.held} targets={targets} showNames={props.showNames} onDown={props.onDown} onUp={props.onUp}/>
      <div className="game-key-hints" aria-hidden="true">{whites.map(note => { const i = [0, 2, 4, 5, 7, 9, 11, 12].indexOf(note - props.root); return <span key={note}>{i >= 0 ? ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'][i] : '\u00a0'}<small>{i >= 0 && i < 5 ? `finger ${i + 1}` : ''}</small></span>; })}</div>
    </div></div>
    <div className="game-help"><p>Use your LUMI, tap the piano, or use A S D F G for C D E F G. Lift between repeated notes. Timing earns points; note length is a guide.</p><button className="text-button" onClick={() => props.learn(songId)}>Learn this song at your pace →</button></div>
    {storageError && <p className="notice" role="status">Your score is shown here, but browser storage could not save it.</p>}
  </section>;
}
