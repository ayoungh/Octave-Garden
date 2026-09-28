import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Lesson, NoteEvent } from './lib/types';
import { expireNotes, freshRound, hitNote, hitWindow, songChart } from './lib/game';
import type { Round } from './lib/game';
export type GamePhase = 'idle' | 'loading' | 'running' | 'paused' | 'finished';
type Snapshot = { phase: GamePhase; elapsed: number; round: Round };
export type GameBridge = { input: RefObject<((event: NoteEvent) => void) | null>; pause: RefObject<(() => void) | null> };
type Audio = { start: () => Promise<boolean>; silence: () => void; beat: (accent: boolean) => void };

export function useGame(song: Lesson, bpm: number, root: number, audio: Audio, bridge: GameBridge, onFinish: (round: Round) => void) {
  const beat = 60000 / bpm;
  const lead = beat * 4;
  const chart = useMemo(() => songChart(song.steps, bpm, root), [song, bpm, root]);
  const end = Math.max(...chart.map(n => n.at + n.duration)) + hitWindow(bpm);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ phase: 'idle', elapsed: -lead, round: freshRound() }));
  const current = useRef(snapshot);
  const origin = useRef(0);
  const frame = useRef(0);
  const generation = useRef(0);
  const lastBeat = useRef<number | null>(null);
  const callbacks = useRef({ audio, onFinish });
  callbacks.current = { audio, onFinish };
  const [click, setClick] = useState(true);
  const clickRef = useRef(click); clickRef.current = click;
  const publish = useCallback((next: Snapshot) => { current.current = next; setSnapshot(next); }, []);
  const reset = useCallback(() => {
    generation.current++; cancelAnimationFrame(frame.current); callbacks.current.audio.silence();
    lastBeat.current = null;
    publish({ phase: 'idle', elapsed: -lead, round: freshRound() });
  }, [lead, publish]);
  const pause = useCallback(() => {
    generation.current++;
    if (current.current.phase === 'loading') { publish({ ...current.current, phase: 'idle' }); return; }
    if (current.current.phase !== 'running') return;
    cancelAnimationFrame(frame.current); callbacks.current.audio.silence();
    publish({ ...current.current, phase: 'paused' });
  }, [publish]);
  const tick = useCallback(function animate() {
    if (current.current.phase !== 'running') return;
    const elapsed = performance.now() - origin.current;
    const round = expireNotes(current.current.round, chart, elapsed, hitWindow(bpm));
    if (elapsed >= end) {
      publish({ phase: 'finished', elapsed: end, round }); callbacks.current.audio.silence(); callbacks.current.onFinish(round); return;
    }
    const count = Math.floor(elapsed / beat);
    if (lastBeat.current !== count) {
      lastBeat.current = count;
      if (elapsed < 0 || clickRef.current) callbacks.current.audio.beat(count % 4 === 0);
    }
    publish({ phase: 'running', elapsed, round });
    frame.current = requestAnimationFrame(animate);
  }, [beat, bpm, chart, end, publish]);
  async function start() {
    reset(); const token = generation.current;
    publish({ phase: 'loading', elapsed: -lead, round: freshRound() });
    const ready = await callbacks.current.audio.start();
    if (token !== generation.current) return;
    if (!ready) { publish({ ...current.current, phase: 'idle' }); return; }
    origin.current = performance.now() + lead;
    publish({ phase: 'running', elapsed: -lead, round: freshRound() }); frame.current = requestAnimationFrame(tick);
  }
  function resume() {
    if (current.current.phase !== 'paused') return;
    callbacks.current.audio.silence(); origin.current = performance.now() - current.current.elapsed;
    publish({ ...current.current, phase: 'running' }); frame.current = requestAnimationFrame(tick);
  }
  useEffect(() => {
    reset();
    return () => { generation.current++; cancelAnimationFrame(frame.current); callbacks.current.audio.silence(); };
  }, [chart, reset]);
  useEffect(() => {
    bridge.input.current = event => {
      if (current.current.phase !== 'running' || event.type !== 'on') return;
      const elapsed = event.time - origin.current;
      publish({ ...current.current, round: hitNote(current.current.round, chart, event.note, elapsed, hitWindow(bpm)) });
    };
    bridge.pause.current = pause;
    return () => { bridge.input.current = null; bridge.pause.current = null; };
  }, [bridge.input, bridge.pause, chart, bpm, pause, publish]);
  return { ...snapshot, chart, lead, end, start, pause, resume, reset, click, setClick };
}
