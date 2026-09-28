import * as Tone from 'tone';
import { isPianoNote } from './pianoRange';
const urls: Record<string, string> = { A0: 'A0.mp3', C8: 'C8.mp3' };
for (let octave = 1; octave <= 7; octave++) for (const [pitch, file] of [['C', 'C'], ['D#', 'Ds'], ['F#', 'Fs'], ['A', 'A']]) urls[`${pitch}${octave}`] = `${file}${octave}.mp3`;
const frequency = (note: number) => 440 * 2 ** ((note - 69) / 12);

export class PianoAudio {
  private context: Tone.Context | null = null;
  private piano: Tone.Sampler | null = null;
  private demo: Tone.Sampler | null = null;
  private click: Tone.Synth | null = null;
  private limiter: Tone.Limiter | null = null;
  private loading: Promise<void> | null = null;
  private cancelLoad: (() => void) | null = null;
  private voices = new Set<number>();
  private level = 70;
  ready = false;

  start(): Promise<void> {
    if (this.loading) return this.loading;
    if (this.ready && this.context) return this.context.resume();
    // Own the context so a sound restart can actually replace the audio device graph.
    // A short scheduling cushion avoids scheduling attacks at the rendering deadline.
    const context = new Tone.Context({ latencyHint: 'interactive', lookAhead: 0.03 });
    this.context = context;
    const pending = this.initialize(context);
    this.loading = pending;
    void pending.finally(() => { if (this.loading === pending) this.loading = null; }).catch(() => {});
    return pending;
  }

  private async initialize(context: Tone.Context) {
    try {
      await context.resume();
      if (this.context !== context) throw new Error('Piano start was cancelled. Please retry.');
      const limiter = new Tone.Limiter({ context, threshold: -3 }).toDestination();
      this.limiter = limiter;
      const create = () => new Promise<Tone.Sampler>((resolve, reject) => {
        let sampler: Tone.Sampler;
        let settled = false;
        const finish = (error?: Error) => {
          if (settled) return;
          settled = true; clearTimeout(timeout); this.cancelLoad = null;
          if (error) { sampler.dispose(); reject(error); } else resolve(sampler);
        };
        const timeout = window.setTimeout(() => finish(new Error('Piano samples took too long to load. Please retry.')), 20000);
        this.cancelLoad = () => finish(new Error('Piano start was cancelled. Please retry.'));
        sampler = new Tone.Sampler({ context, urls, baseUrl: '/samples/', attack: 0.004, release: 0.3, volume: -12,
          onload: () => finish(), onerror: () => finish(new Error('Piano samples could not load. Check that the local server is running, then retry.')) }).connect(limiter);
      });
      const piano = await create();
      if (this.context !== context) { piano.dispose(); throw new Error('Piano start was cancelled. Please retry.'); }
      this.piano = piano;
      const demo = await create();
      if (this.context !== context) { demo.dispose(); throw new Error('Piano start was cancelled. Please retry.'); }
      this.demo = demo;
      this.click = new Tone.Synth({ context, volume: -22, oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.025, sustain: 0, release: 0.02 } }).connect(limiter);
      this.ready = true;
      this.volume(this.level);
    } catch (error) {
      if (this.context === context) this.dispose();
      throw error;
    }
  }

  volume(value: number) {
    this.level = Math.min(100, Math.max(0, value));
    // Keep headroom before the shared limiter and ramp changes to avoid gain clicks.
    const decibels = this.level === 0 ? -Infinity : Tone.gainToDb(this.level / 100) - 12;
    this.piano?.volume.rampTo(decibels, 0.03);
    this.demo?.volume.rampTo(decibels, 0.03);
    this.click?.volume.rampTo(decibels - 10, 0.03);
  }
  on(note: number, velocity: number) {
    if (!this.ready || !this.context || this.voices.has(note) || !isPianoNote(note)) return;
    this.voices.add(note);
    this.piano?.triggerAttack(frequency(note), this.context.now(), Math.min(1, Math.max(0.08, velocity)));
  }
  off(note: number) {
    if (!this.voices.delete(note) || !this.context) return;
    this.piano?.triggerRelease(frequency(note), this.context.now());
  }
  demonstrate(note: number, seconds: number) { if (this.ready && this.context && isPianoNote(note)) this.demo?.triggerAttackRelease(frequency(note), seconds, this.context.now(), 0.65); }
  beat(accent = false, secondsAhead = 0) { if (this.ready && this.context) this.click?.triggerAttackRelease(accent ? 1200 : 850, 0.025, this.context.now() + secondsAhead, 0.7); }
  stopDemo() { this.demo?.releaseAll(); }
  allOff() { this.voices.clear(); this.piano?.releaseAll(); this.demo?.releaseAll(); }
  dispose() {
    this.ready = false; this.cancelLoad?.(); this.cancelLoad = null;
    this.allOff(); this.piano?.dispose(); this.demo?.dispose(); this.click?.dispose(); this.limiter?.dispose();
    this.piano = null; this.demo = null; this.click = null; this.limiter = null;
    this.context?.dispose(); this.context = null; this.loading = null;
  }
}
