// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceProfile, MidiAccessLike, MidiInputLike, MidiOutputLike } from '../src/lib/types';
const mockAudio = vi.hoisted(() => ({ start: vi.fn(async () => {}), on: vi.fn(), off: vi.fn(), demonstrate: vi.fn(), beat: vi.fn(), allOff: vi.fn() }));
vi.mock('../src/lib/audio', () => ({ PianoAudio: class {
  ready = false;
  async start() { await mockAudio.start(); this.ready = true; }
  on = mockAudio.on; off = mockAudio.off; demonstrate = mockAudio.demonstrate; beat = mockAudio.beat; allOff = mockAudio.allOff;
  stopDemo() {} volume() {} dispose() {}
} }));
import { useStudio } from '../src/useStudio';
import { STORAGE_KEY, decodeState } from '../src/lib/storage';
import { songs } from '../src/data/songs';
let input: MidiInputLike;
let output: MidiOutputLike;
let access: MidiAccessLike;
const profile: DeviceProfile = { inputId: 'input', outputId: 'output', low: 48, high: 71, calibrated: true, channel: 0 };
beforeEach(() => {
  // Node 24 also exposes a native localStorage; isolate the browser storage boundary.
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), clear: () => stored.clear() });
  vi.useFakeTimers(); vi.clearAllMocks(); mockAudio.start.mockResolvedValue(undefined);
  input = { id: 'input', name: 'LUMI', state: 'connected', onmidimessage: null };
  output = { id: 'output', name: 'LUMI', state: 'connected', send: vi.fn() };
  access = { inputs: new Map([['input', input]]), outputs: new Map([['output', output]]), onstatechange: null };
  Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: vi.fn(async () => access) });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const strike = (note: number, channel = 0) => { input.onmidimessage?.({ data: new Uint8Array([0x90 | channel, note, 80]), timeStamp: performance.now() }); input.onmidimessage?.({ data: new Uint8Array([0x80 | channel, note, 0]), timeStamp: performance.now() }); };
describe('studio integration with simulated MIDI and audio', () => {
  it('completes a lesson only after three fresh key presses and persists it once', () => {
    const { result } = renderHook(useStudio);
    act(() => result.current.changeStage('try'));
    act(() => { result.current.screenDown(60, 'test'); result.current.screenDown(60, 'test'); });
    expect(result.current.exercise.index).toBe(1);
    act(() => result.current.screenUp(60, 'test'));
    for (let i = 0; i < 2; i++) act(() => { result.current.screenDown(60, 'test'); result.current.screenUp(60, 'test'); });
    expect(result.current.exercise.complete).toBe(true);
    expect(result.current.saved.sessions).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).completed).toEqual(['find-c']);
  });
  it('demonstration playback never advances the learner or marks a lesson complete', async () => {
    const { result } = renderHook(useStudio);
    act(() => result.current.changeStage('try'));
    await act(async () => { await result.current.demonstrate(); });
    act(() => vi.advanceTimersByTime(4000));
    expect(mockAudio.demonstrate).toHaveBeenCalledTimes(3);
    expect(result.current.exercise.index).toBe(0);
    expect(result.current.saved.completed).toEqual([]);
  });
  it('free play does not grade notes', () => {
    const { result } = renderHook(useStudio);
    act(() => result.current.changeView('free'));
    act(() => { result.current.screenDown(60, 'test'); result.current.screenUp(60, 'test'); });
    expect(result.current.exercise.index).toBe(0);
  });
  it('receives selected MIDI channels and pauses on disconnection', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([profile]));
    act(() => result.current.changeStage('try'));
    act(() => strike(60, 7));
    expect(result.current.exercise.index).toBe(1);
    act(() => { input.state = 'disconnected'; access.onstatechange?.(); });
    expect(result.current.paused).toBe(true);
    expect(mockAudio.allOff).toHaveBeenCalled();
    act(() => { input.state = 'connected'; access.onstatechange?.(); });
    expect(result.current.paused).toBe(true);
    act(() => strike(60));
    expect(result.current.exercise.index).toBe(1);
    act(() => result.current.resume());
    act(() => strike(60));
    expect(result.current.exercise.index).toBe(2);
  });
  it('calibrates the two endpoints without scoring those notes', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([{ ...profile, calibrated: false }]));
    act(() => result.current.openSetup());
    act(() => result.current.calibrate({ inputId: 'input', phase: 'low' }));
    act(() => strike(36));
    expect(result.current.calibration?.phase).toBe('high');
    act(() => strike(59));
    expect(result.current.saved.devices[0]).toMatchObject({ low: 36, high: 59, calibrated: true });
    expect(result.current.root).toBe(48);
    expect(result.current.exercise.index).toBe(0);
  });
  it('tests and clears factory lights but waits for visual confirmation', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([profile]));
    act(() => result.current.openSetup());
    act(() => result.current.testLight(profile));
    expect(output.send).toHaveBeenCalledWith([0x90, 48, 11]);
    expect(result.current.verified.size).toBe(0);
    act(() => vi.advanceTimersByTime(6000));
    expect(output.send).toHaveBeenCalledWith([0x80, 48, 0]);
    expect(result.current.lightTest?.status).toBe('confirm');
    act(() => result.current.confirmLight(true));
    expect(result.current.allLightsVerified).toBe(true);
    act(() => { output.state = 'disconnected'; access.onstatechange?.(); });
    expect(result.current.verified.size).toBe(0);
  });
  it('tests a non-C key using the selected factory colour without scoring input', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    const gold = { ...profile, lightColour: 40 };
    act(() => result.current.changeProfiles([gold]));
    act(() => result.current.openSetup());
    act(() => result.current.testLight(gold, 4));
    expect(output.send).toHaveBeenCalledWith([0x90, 52, 40]);
    expect(result.current.exercise.index).toBe(0);
    act(() => vi.advanceTimersByTime(6000));
    expect(output.send).toHaveBeenLastCalledWith([0x80, 52, 0]);
    expect(result.current.lightTest).toMatchObject({ note: 52, status: 'confirm' });
  });
  it('keeps a light test on when Web MIDI reports opening an already connected port', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([profile]));
    act(() => result.current.openSetup());
    act(() => result.current.testLight(profile, 4));
    vi.mocked(output.send).mockClear();
    act(() => access.onstatechange?.());
    expect(output.send).not.toHaveBeenCalled();
    expect(result.current.lightTest?.status).toBe('running');
    act(() => vi.advanceTimersByTime(6000));
    expect(output.send).toHaveBeenCalledWith([0x80, 52, 0]);
  });
  it('keeps on-screen guidance when the user reports unavailable physical lights', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([profile]));
    act(() => result.current.testLight(profile));
    act(() => vi.advanceTimersByTime(6000));
    act(() => result.current.confirmLight(false));
    expect(result.current.lightTest?.status).toBe('failed');
    expect(result.current.saved.guidance).toBe(true);
    expect(result.current.allLightsVerified).toBe(false);
  });
  it('handles two units with adjacent ranges and overlapping channels', async () => {
    const second: MidiInputLike = { id: 'second', name: 'LUMI 2', state: 'connected', onmidimessage: null }; access.inputs.set('second', second);
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([profile, { ...profile, inputId: 'second', low: 72, high: 95 }]));
    expect(result.current.low).toBe(48); expect(result.current.high).toBe(95);
    // Recalibrate the second unit into the overlapping octave before testing shared pitches.
    act(() => result.current.changeProfiles([profile, { ...profile, inputId: 'second' }]));
    act(() => result.current.changeStage('try'));
    act(() => { input.onmidimessage?.({ data: new Uint8Array([0x91, 60, 90]), timeStamp: 1 }); second.onmidimessage?.({ data: new Uint8Array([0x92, 60, 90]), timeStamp: 2 }); });
    expect(result.current.exercise.index).toBe(1);
    act(() => { input.onmidimessage?.({ data: new Uint8Array([0x81, 60, 0]), timeStamp: 3 }); });
    expect(result.current.held).toEqual([60]);
    act(() => { second.onmidimessage?.({ data: new Uint8Array([0x82, 60, 0]), timeStamp: 4 }); });
    expect(result.current.held).toEqual([]);
  });
  it('flags an octave change and clears the warning after physical recalibration', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([profile]));
    act(() => result.current.changeStage('try'));
    act(() => strike(36));
    expect(result.current.rangeChanged).toBe(true); expect(result.current.paused).toBe(true);
    expect(result.current.exercise.index).toBe(0);
    act(() => result.current.openSetup());
    act(() => result.current.calibrate({ inputId: 'input', phase: 'low' }));
    act(() => strike(36)); act(() => strike(59));
    expect(result.current.rangeChanged).toBe(false);
    expect(result.current.low).toBe(36); expect(result.current.high).toBe(59);
  });
  it('shifts low keyboard input into the piano register and maps lights back to physical notes', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    const shifted = { ...profile, low: 0, high: 23, octaveShift: 4 };
    act(() => result.current.changeProfiles([shifted]));
    expect(result.current.low).toBe(48); expect(result.current.high).toBe(71);
    act(() => result.current.changeStage('try'));
    act(() => strike(12));
    expect(mockAudio.on).toHaveBeenCalledWith(60, 80 / 127);
    expect(result.current.exercise.index).toBe(1);
    act(() => result.current.openSetup());
    act(() => result.current.testLight(shifted));
    expect(output.send).toHaveBeenCalledWith([0x90, 0, 11]);
    act(() => vi.advanceTimersByTime(6000));
    expect(output.send).toHaveBeenCalledWith([0x80, 0, 0]);
  });
  it.each(songs)('completes $title and restores its saved song progress', song => {
    const { result } = renderHook(useStudio);
    act(() => result.current.openLesson(song.id));
    act(() => result.current.changeStage('try'));
    for (const step of song.steps) act(() => { result.current.screenDown(step.notes[0], 'song'); result.current.screenUp(step.notes[0], 'song'); });
    expect(result.current.exercise.complete).toBe(true);
    expect(result.current.exercise.correct).toBe(song.steps.length);
    const restored = decodeState(localStorage.getItem(STORAGE_KEY));
    expect(restored.lessonId).toBe(song.id); expect(restored.completed).toContain(song.id);
    expect(restored.sessions.at(-1)?.lessonId).toBe(song.id);
  });
  it('plays a song with its longer note durations without scoring learner progress', async () => {
    const { result } = renderHook(useStudio);
    act(() => result.current.openLesson('song-hot-cross-buns'));
    await act(async () => { await result.current.demonstrate(); });
    act(() => vi.advanceTimersByTime(32000));
    expect(mockAudio.demonstrate).toHaveBeenCalledTimes(17);
    expect(mockAudio.demonstrate.mock.calls.some(call => call[1] === 3.2)).toBe(true);
    expect(result.current.playing).toBe(true);
    act(() => vi.advanceTimersByTime(101));
    expect(result.current.playing).toBe(false); expect(result.current.saved.completed).toEqual([]);
  });
  it('uses the same targets for the screen and physical lesson lights, then clears both', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([profile]));
    act(() => result.current.openSetup()); act(() => result.current.testLight(profile));
    act(() => vi.advanceTimersByTime(6000)); act(() => result.current.confirmLight(true));
    act(() => result.current.closeSetup()); act(() => result.current.openLesson('song-hot-cross-buns'));
    expect(result.current.guideTargets).toEqual([64]);
    expect(vi.mocked(output.send).mock.calls.slice(-2)).toEqual([[[0x90, 64, 11]], [[0xa0, 64, 127]]]);
    act(() => result.current.changeStage('try'));
    act(() => strike(64));
    expect(result.current.guideTargets).toEqual([62]);
    expect(vi.mocked(output.send).mock.calls.slice(-2)).toEqual([[[0x90, 62, 11]], [[0xa0, 62, 127]]]);
    act(() => result.current.patch({ guidance: false }));
    expect(result.current.guideTargets).toEqual([]);
    expect(output.send).toHaveBeenLastCalledWith([0x80, 62, 0]);
    act(() => result.current.patch({ guidance: true }));
    act(() => result.current.allOff());
    expect(result.current.guideTargets).toEqual([]);
    expect(output.send).toHaveBeenLastCalledWith([0x80, 62, 0]);
  });
  it('reapplies the first light when restarting at the same note', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi()); act(() => result.current.changeProfiles([profile]));
    act(() => result.current.openSetup()); act(() => result.current.testLight(profile));
    act(() => vi.advanceTimersByTime(6000)); act(() => result.current.confirmLight(true)); act(() => result.current.closeSetup());
    act(() => result.current.restart());
    expect(vi.mocked(output.send).mock.calls.slice(-2)).toEqual([[[0x90, 60, 11]], [[0xa0, 60, 127]]]);
    expect(result.current.guideTargets).toEqual([60]);
  });
  it('synchronises demonstration light gaps with the on-screen keyboard and clears on stop', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi()); act(() => result.current.changeProfiles([profile]));
    act(() => result.current.openSetup()); act(() => result.current.testLight(profile));
    act(() => vi.advanceTimersByTime(6000)); act(() => result.current.confirmLight(true)); act(() => result.current.closeSetup());
    act(() => result.current.changeStage('listen'));
    expect(result.current.guideTargets).toEqual([]);
    await act(async () => { await result.current.demonstrate(); });
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.guideTargets).toEqual([60]); expect(vi.mocked(output.send).mock.calls.slice(-2)).toEqual([[[0x90, 60, 11]], [[0xa0, 60, 127]]]);
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.guideTargets).toEqual([]); expect(output.send).toHaveBeenLastCalledWith([0x80, 60, 0]);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.guideTargets).toEqual([60]);
    await act(async () => { await result.current.demonstrate(); });
    expect(result.current.guideTargets).toEqual([]); expect(output.send).toHaveBeenLastCalledWith([0x80, 60, 0]);
  });
  it('does not verify a light test if its note-off fails', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi()); act(() => result.current.changeProfiles([profile]));
    act(() => result.current.openSetup()); act(() => result.current.testLight(profile));
    vi.mocked(output.send).mockImplementation(() => { throw new Error('lost output'); });
    act(() => vi.advanceTimersByTime(6000));
    expect(result.current.lightTest?.status).toBe('failed');
    act(() => result.current.confirmLight(true)); expect(result.current.allLightsVerified).toBe(false);
  });
  it('shows MIDI permission denial and unsupported-browser guidance', async () => {
    const { result } = renderHook(useStudio);
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')) });
    await act(async () => result.current.connectMidi());
    expect(result.current.midiError).toContain('permission was declined');
    Object.defineProperty(navigator, 'requestMIDIAccess', { configurable: true, value: undefined });
    await act(async () => result.current.connectMidi());
    expect(result.current.midiError).toContain('Chrome');
  });
  it('handles missing devices without claiming a connection', async () => {
    access.inputs.clear(); access.outputs.clear();
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    expect(result.current.connectedProfiles).toEqual([]);
    expect(result.current.midiError).toBe('');
  });
  it('reports a piano loading failure and recovers on retry', async () => {
    const { result } = renderHook(useStudio);
    mockAudio.start.mockRejectedValueOnce(new Error('Piano samples could not load.'));
    await act(async () => { await result.current.enableAudio(); });
    expect(result.current.audioStatus).toBe('error');
    expect(result.current.audioError).toContain('could not load');
    await act(async () => { await result.current.enableAudio(); });
    expect(result.current.audioStatus).toBe('ready');
  });
  it('clears held notes and pauses on panic or focus loss', () => {
    const { result } = renderHook(useStudio);
    act(() => result.current.screenDown(62, 'test'));
    act(() => window.dispatchEvent(new Event('blur')));
    expect(result.current.held).toEqual([]);
    expect(result.current.paused).toBe(true);
  });
  it('starts timed practice after a four-beat count-in and can cancel it', async () => {
    const { result } = renderHook(useStudio);
    act(() => result.current.openLesson('steady-beats'));
    act(() => result.current.changeStage('try'));
    act(() => result.current.setRhythm(true));
    await act(async () => { await result.current.beginRhythm(); });
    expect(result.current.countIn).toBe(4);
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.countIn).toBeNull();
    expect(mockAudio.beat).toHaveBeenCalledTimes(5);
    act(() => result.current.allOff());
    const calls = mockAudio.beat.mock.calls.length;
    act(() => vi.advanceTimersByTime(20000));
    expect(mockAudio.beat).toHaveBeenCalledTimes(calls);
    expect(result.current.timedRunning).toBe(false);
  });
  it('routes fresh game presses through normalization without advancing lessons', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([{ ...profile, octaveShift: 1 }]));
    act(() => result.current.changeView('game'));
    const receive = vi.fn(); result.current.gameInput.current = receive;
    act(() => {
      input.onmidimessage?.({ data: new Uint8Array([0x97, 48, 80]), timeStamp: performance.now() });
      input.onmidimessage?.({ data: new Uint8Array([0x97, 48, 80]), timeStamp: performance.now() });
      result.current.screenDown(60, 'overlap');
    });
    expect(receive).toHaveBeenCalledTimes(1);
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'on', note: 60, channel: 7 }));
    act(() => input.onmidimessage?.({ data: new Uint8Array([0x97, 48, 0]), timeStamp: performance.now() }));
    expect(receive).toHaveBeenCalledTimes(1);
    act(() => result.current.screenUp(60, 'overlap'));
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'off', note: 60 }));
    act(() => strike(48, 7));
    expect(receive.mock.calls.filter(([event]) => event.type === 'on')).toHaveLength(2);
    expect(result.current.exercise.index).toBe(0);
    expect(result.current.saved.completed).toEqual([]);
  });
  it('pauses a game on MIDI loss, focus loss and setup without automatically resuming', async () => {
    const { result } = renderHook(useStudio);
    await act(async () => result.current.connectMidi());
    act(() => result.current.changeProfiles([profile]));
    act(() => result.current.changeView('game'));
    const pause = vi.fn(); result.current.gamePause.current = pause;
    act(() => { input.state = 'disconnected'; access.onstatechange?.(); });
    expect(pause).toHaveBeenCalled(); pause.mockClear();
    act(() => { input.state = 'connected'; access.onstatechange?.(); });
    expect(result.current.paused).toBe(true);
    act(() => window.dispatchEvent(new Event('blur')));
    expect(pause).toHaveBeenCalled(); pause.mockClear();
    act(() => result.current.openSetup()); expect(pause).toHaveBeenCalled();
  });

});
