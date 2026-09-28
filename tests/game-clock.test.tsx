// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGame } from '../src/useGame';
import type { GameBridge } from '../src/useGame';
import type { Lesson } from '../src/lib/types';
const song: Lesson = { id: 'song-test', title: 'Test', heading: '', description: '', explanation: [], steps: [{ instruction: 'Play the note', notes: [60], beats: 1 }, { instruction: 'Play the note', notes: [62], beats: 1 }] };
const audio = { start: vi.fn(async () => true), silence: vi.fn(), beat: vi.fn() };
let bridge: GameBridge;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }); vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => setTimeout(() => fn(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  bridge = { input: { current: null }, pause: { current: null } };
  audio.start.mockResolvedValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('counts in, grades MIDI presses, freezes on pause, resumes and finishes once', async () => {
  const finished = vi.fn();
  const { result } = renderHook(() => useGame(song, 60, 60, audio, bridge, finished));
  await act(async () => result.current.start());
  act(() => vi.advanceTimersByTime(4000));
  act(() => bridge.input.current?.({ type: 'on', note: 60, time: performance.now(), source: 'midi', velocity: 1, channel: 0 }));
  expect(result.current.round.hits).toBe(1);
  act(() => bridge.pause.current?.());
  const frozen = result.current.elapsed;
  act(() => vi.advanceTimersByTime(10000));
  expect(result.current.elapsed).toBe(frozen);
  expect(result.current.round.misses).toBe(0);
  act(() => result.current.resume());
  act(() => vi.advanceTimersByTime(1000));
  act(() => bridge.input.current?.({ type: 'on', note: 62, time: performance.now(), source: 'midi', velocity: 1, channel: 0 }));
  expect(result.current.round.hits).toBe(2);
  act(() => vi.advanceTimersByTime(2000));
  expect(result.current.phase).toBe('finished');
  expect(finished).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(5000)); expect(finished).toHaveBeenCalledTimes(1);
});
it('cancels startup when paused or unmounted while audio is loading', async () => {
  let ready!: (value: boolean) => void;
  audio.start.mockImplementation(() => new Promise(resolve => { ready = resolve; }));
  const { result, unmount } = renderHook(() => useGame(song, 60, 60, audio, bridge, vi.fn()));
  let pending!: Promise<void>;
  act(() => { pending = result.current.start(); });
  expect(result.current.phase).toBe('loading');
  act(() => bridge.pause.current?.());
  await act(async () => { ready(true); await pending; });
  expect(result.current.phase).toBe('idle');
  unmount(); expect(bridge.input.current).toBeNull(); expect(bridge.pause.current).toBeNull();
});
it('returns to idle if audio fails and resets on song or octave changes', async () => {
  audio.start.mockResolvedValue(false);
  const { result, rerender } = renderHook(({ root }) => useGame(song, 60, root, audio, bridge, vi.fn()), { initialProps: { root: 60 } });
  await act(async () => result.current.start()); expect(result.current.phase).toBe('idle');
  audio.start.mockResolvedValue(true);
  await act(async () => result.current.start());
  rerender({ root: 48 });
  expect(result.current.phase).toBe('idle'); expect(result.current.chart[0].note).toBe(48);
});
