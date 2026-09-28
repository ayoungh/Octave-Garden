// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ contexts: [] as any[], samplers: [] as any[], limiters: [] as any[], autoLoad: true }));
vi.mock('tone', () => {
  class Node {
    volume = { rampTo: vi.fn() };
    dispose = vi.fn();
    connect = vi.fn(() => this);
    toDestination = vi.fn(() => this);
    triggerAttack = vi.fn(); triggerRelease = vi.fn(); triggerAttackRelease = vi.fn(); releaseAll = vi.fn();
  }
  return {
    Context: class { resume = vi.fn(async () => {}); dispose = vi.fn(); now = () => 1; constructor(public options: any) { state.contexts.push(this); } },
    Sampler: class extends Node { constructor(public options: any) { super(); state.samplers.push(this); if (state.autoLoad) queueMicrotask(options.onload); } },
    Synth: Node,
    Limiter: class extends Node { constructor(public options: any) { super(); state.limiters.push(this); } },
    gainToDb: (gain: number) => 20 * Math.log10(gain),
  };
});
import { PianoAudio } from '../src/lib/audio';
let audio: PianoAudio;
beforeEach(() => { state.contexts.length = 0; state.samplers.length = 0; state.limiters.length = 0; state.autoLoad = true; audio = new PianoAudio(); });
afterEach(() => audio.dispose());
describe('piano audio lifecycle', () => {
  it('coalesces startup and does not duplicate a voice when enabled again while held', async () => {
    await Promise.all([audio.start(), audio.start()]);
    expect(state.contexts).toHaveLength(1); expect(state.samplers).toHaveLength(2);
    audio.on(60, 0.8); await audio.start(); audio.on(60, 0.65);
    expect(state.samplers[0].triggerAttack).toHaveBeenCalledTimes(1);
    audio.off(60); audio.on(60, 0.8);
    expect(state.samplers[0].triggerAttack).toHaveBeenCalledTimes(2);
  });
  it('does not stretch piano samples into inaudible sub-bass or beyond C8', async () => {
    await audio.start(); audio.on(0, 1); audio.on(20, 1); audio.on(109, 1); audio.demonstrate(12, 1);
    expect(state.samplers[0].triggerAttack).not.toHaveBeenCalled();
    expect(state.samplers[1].triggerAttackRelease).not.toHaveBeenCalled();
    audio.on(21, 1); audio.on(108, 1); expect(state.samplers[0].triggerAttack).toHaveBeenCalledTimes(2);
  });
  it('routes both pianos through one peak limiter and ramps volume changes', async () => {
    await audio.start(); audio.volume(100);
    expect(state.samplers.every(s => s.connect.mock.calls[0][0] === state.limiters[0])).toBe(true);
    expect(state.limiters[0].options.threshold).toBe(-3);
    expect(state.samplers[0].volume.rampTo).toHaveBeenLastCalledWith(-12, 0.03);
    expect(state.samplers[0].options.attack).toBeGreaterThan(0);
  });
  it('replaces the context and releases voices when restarting sound', async () => {
    await audio.start(); audio.on(60, 0.8);
    const oldContext = state.contexts[0], oldPiano = state.samplers[0];
    audio.dispose(); await audio.start(); audio.on(60, 0.8);
    expect(oldPiano.releaseAll).toHaveBeenCalled(); expect(oldPiano.dispose).toHaveBeenCalled();
    expect(oldContext.dispose).toHaveBeenCalled(); expect(state.contexts).toHaveLength(2);
    expect(state.samplers[2].triggerAttack).toHaveBeenCalledTimes(1);
  });
  it('cancels a pending sample load without resurrecting a disposed engine', async () => {
    state.autoLoad = false;
    const start = audio.start(); const rejected = expect(start).rejects.toThrow('cancelled');
    await Promise.resolve(); audio.dispose(); await rejected;
    expect(audio.ready).toBe(false); expect(state.samplers[0].dispose).toHaveBeenCalled();
    state.autoLoad = true; await audio.start(); expect(audio.ready).toBe(true);
  });
});
