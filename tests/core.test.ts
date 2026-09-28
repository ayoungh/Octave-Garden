import { describe, it, expect, vi } from 'vitest';
import { parseMidi, HeldNotes } from '../src/lib/midi';
import { evaluateNote, newExercise } from '../src/lib/engine';
import { LightService } from '../src/lib/lighting';
import { decodeState, defaultState } from '../src/lib/storage';
import { lessons, lessonRoot } from '../src/data/lessons';
import type { DeviceProfile, NoteEvent, MidiOutputLike } from '../src/lib/types';
const on = (note: number, source = 'lumi', channel = 0, time = 1000): NoteEvent => ({ type: 'on', note, source, channel, time, velocity: 0.5 });
const off = (note: number, source = 'lumi', channel = 0): NoteEvent => ({ ...on(note, source, channel), type: 'off' });
const profile: DeviceProfile = { inputId: 'in', outputId: 'out', low: 48, high: 71, channel: 0, calibrated: true };

describe('MIDI notes', () => {
  it('reads velocity and channel and accepts velocity-zero note-offs', () => {
    expect(parseMidi(new Uint8Array([0x95, 60, 100]), 'a', 123)).toMatchObject({ type: 'on', channel: 5, note: 60, velocity: 100 / 127, source: 'a', time: 123 });
    expect(parseMidi(new Uint8Array([0x91, 60, 0]), 'a', 124)?.type).toBe('off');
    expect(parseMidi(new Uint8Array([0x82, 60, 33]), 'a', 124)?.type).toBe('off');
  });
  it('ignores expression and malformed data', () => {
    for (const bytes of [[0xd0, 80], [0xe0, 80, 60], [0x90], [0x90, 200, 70], [0x90, 60, 200], [0xf0, 1, 2]]) expect(parseMidi(new Uint8Array(bytes), 'a', 0)).toBeNull();
  });
  it('requires release before a repeated pitch is a new strike', () => {
    const held = new HeldNotes();
    expect(held.process(on(60))?.type).toBe('on');
    expect(held.process(on(60))).toBeNull();
    expect(held.process(off(60))?.type).toBe('off');
    expect(held.process(on(60))?.type).toBe('on');
  });
  it('does not silence a pitch until every port and channel releases', () => {
    const held = new HeldNotes();
    held.process(on(60, 'a', 1));
    expect(held.process(on(60, 'b', 2))).toBeNull();
    expect(held.process(off(60, 'a', 1))).toBeNull();
    expect(held.notes()).toEqual([60]);
    expect(held.process(off(60, 'b', 2))?.type).toBe('off');
    expect(held.notes()).toEqual([]);
    expect(held.process(off(60, 'b', 2))).toBeNull();
  });
});
describe('beginner course', () => {
  it('wrong notes and releases do not advance the lesson', () => {
    const state = evaluateNote(newExercise(), on(62), lessons[0].steps, 60);
    expect(state).toMatchObject({ index: 0, mistakes: 1 });
    expect(evaluateNote(state, off(60), lessons[0].steps, 60)).toBe(state);
  });
  it('supports the same lesson in a lower calibrated octave', () => {
    expect(evaluateNote(newExercise(), on(48), lessons[0].steps, 48).index).toBe(1);
    expect(evaluateNote(newExercise(), on(60), lessons[0].steps, 48).index).toBe(0);
  });
  it('finishes once and ignores later events', () => {
    let state = newExercise();
    for (let i = 0; i < 3; i++) state = evaluateNote(state, on(60), lessons[0].steps, 60);
    expect(state).toMatchObject({ complete: true, correct: 3, index: 3 });
    expect(evaluateNote(state, on(60), lessons[0].steps, 60)).toBe(state);
  });
  it('rejects an early timed strike and records on-time and late offsets', () => {
    const timing = { start: 5000, bpm: 60 };
    const early = evaluateNote(newExercise(), on(60, 'a', 0, 4000), lessons[3].steps, 60, timing);
    expect(early.index).toBe(0);
    const first = evaluateNote(early, on(60, 'a', 0, 5020), lessons[3].steps, 60, timing);
    const second = evaluateNote(first, on(60, 'a', 0, 6300), lessons[3].steps, 60, timing);
    expect(second.timing).toEqual([20, 300]);
    expect(second.message).toContain('closer to the click');
  });
  it('fits every lesson into a single LUMI', () => {
    for (const lesson of lessons) for (const step of lesson.steps) for (const note of step.notes) expect(note).toBeGreaterThanOrEqual(60);
    expect(Math.max(...lessons.flatMap(l => l.steps.flatMap(s => s.notes)))).toBeLessThanOrEqual(67);
    expect(lessonRoot(48, 71)).toBe(60);
    expect(lessonRoot(36, 59)).toBe(48);
    expect(lessonRoot(61, 66)).toBeNull();
    expect(lessonRoot(0, 23)).toBeNull();
    expect(lessonRoot(108, 127)).toBeNull();
  });
});
describe('factory lighting', () => {
  it('sends no guidance before visual confirmation, but permits the isolated test', () => {
    const output: MidiOutputLike = { id: 'out', name: 'LUMI', state: 'connected', send: vi.fn() };
    const outputs = new Map([['out', output]]);
    const lights = new LightService();
    lights.show([60], [profile], outputs);
    expect(output.send).not.toHaveBeenCalled();
    lights.show([60], [profile], outputs, true);
    lights.clear();
    expect(output.send).toHaveBeenNthCalledWith(1, [0x90, 60, 11]);
    expect(output.send).toHaveBeenNthCalledWith(2, [0xa0, 60, 127]);
    expect(output.send).toHaveBeenNthCalledWith(3, [0x80, 60, 0]);
    expect(lights.verified.size).toBe(0);
  });
  it('routes only in-range notes and clears the previous target', () => {
    const output = { id: 'out', name: 'LUMI', state: 'connected', send: vi.fn() };
    const outputs = new Map([['out', output]]);
    const lights = new LightService(); lights.verified.add('out');
    lights.show([60, 80], [{ ...profile, channel: 4 }], outputs);
    lights.show([62], [{ ...profile, channel: 4 }], outputs);
    expect(output.send.mock.calls).toEqual([[[0x94, 60, 11]], [[0xa4, 60, 127]], [[0x84, 60, 0]], [[0x94, 62, 11]], [[0xa4, 62, 127]]]);
    lights.invalidate(); expect(lights.verified.size).toBe(0);
    expect(output.send).toHaveBeenLastCalledWith([0x84, 62, 0]);
  });
  it('retries pending note-offs on a recovered output', () => {
    const output = { id: 'out', name: 'LUMI', state: 'connected', send: vi.fn() };
    const lights = new LightService();
    lights.show([60], [profile], new Map([['out', output]]), true);
    output.send.mockImplementation(() => { throw new Error('disconnected'); });
    lights.clear();
    const recovered = { ...output, send: vi.fn() };
    lights.reconnect(new Map([['out', recovered]]));
    expect(recovered.send).toHaveBeenCalledWith([0x80, 60, 0]);
  });
  it('reports a failed send and never verifies automatically', () => {
    const output = { id: 'out', name: 'LUMI', state: 'connected', send: () => { throw new Error('failed'); } };
    const lights = new LightService();
    expect(lights.show([60], [profile], new Map([['out', output]]), true)).toBe(false);
    expect(lights.error).toContain('could not be sent');
    expect(lights.verified.size).toBe(0);
  });
});
describe('local persistence', () => {
  it('restores course position, preferences and progress', () => {
    const state = { ...defaultState(), lessonId: 'meet-de', step: 2, stage: 'try', volume: 42, completed: ['find-c'], sessions: [{ lessonId: 'find-c', date: '2026-09-28T12:00:00Z', correct: 3, mistakes: 1, mode: 'wait' }] };
    expect(decodeState(JSON.stringify(state))).toEqual(state);
  });
  it('recovers from invalid JSON, stale versions and corrupt fields', () => {
    expect(decodeState('{')).toEqual(defaultState());
    expect(decodeState('{"version":2}')).toEqual(defaultState());
    const state = decodeState(JSON.stringify({ version: 1, lessonId: 'missing', step: 999, volume: -5, bpm: 'fast', devices: [{ inputId: 'a', outputId: 'b', low: 90, high: 20 }], sessions: [null], completed: ['missing', 'find-c', 'find-c'] }));
    expect(state).toMatchObject({ lessonId: 'find-c', step: 0, volume: 70, bpm: 60, devices: [], sessions: [], completed: ['find-c'] });
  });
  it('keeps supported lighting colours and rejects invalid MIDI colour values', () => {
    const saved = (lightColour: number) => decodeState(JSON.stringify({ ...defaultState(), devices: [{ ...profile, lightColour }] })).devices[0].lightColour;
    expect(saved(40)).toBe(40);
    expect(saved(127)).toBe(127);
    expect(saved(255)).toBe(11);
  });
});
