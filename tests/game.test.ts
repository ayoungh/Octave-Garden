import { describe, expect, it, vi, afterEach } from 'vitest';
import { expireNotes, freshRound, hitNote, hitWindow, songChart, loadGameRecords, saveGameRecord } from '../src/lib/game';
import { songs } from '../src/data/songs';
const chart = songChart([{ instruction: 'Play the note', notes: [60], beats: 1 }, { instruction: 'Play the note', notes: [60], beats: 0.5 }, { instruction: 'Play the note', notes: [62], beats: 2 }], 60, 60);
afterEach(() => vi.unstubAllGlobals());
describe('song-game scoring', () => {
  it('uses authored durations and transposes the chart to the selected octave', () => {
    const notes = songChart(songs[0].steps, 120, 48);
    expect(notes.slice(0, 3).map(n => [n.note, n.at, n.duration])).toEqual([[52, 0, 1000], [50, 1000, 1000], [48, 2000, 2000]]);
  });
  it('awards perfect and good hits once, preserving repeated-note targets', () => {
    let state = hitNote(freshRound(), chart, 60, 0, 220);
    expect(state).toMatchObject({ score: 100, hits: 1, combo: 1, feedback: 'Perfect' });
    state = hitNote(state, chart, 60, 10, 220);
    expect(state).toMatchObject({ hits: 1, wrong: 1, combo: 0 });
    state = hitNote(state, chart, 60, 1150, 220);
    expect(state).toMatchObject({ score: 170, hits: 2, feedback: 'Good' });
  });
  it('ignores count-in presses and bounds early/late hits', () => {
    const empty = freshRound();
    expect(hitNote(empty, chart, 60, -500, 220)).toBe(empty);
    expect(hitNote(empty, chart, 60, -220, 220).hits).toBe(1);
    expect(hitNote(empty, chart, 60, 221, 220)).toMatchObject({ hits: 0, misses: 1, wrong: 1 });
    expect(hitWindow(120)).toBe(150);
  });
  it('marks skipped notes once and resets a streak without blocking later notes', () => {
    let state = hitNote(freshRound(), chart, 60, 0, 220);
    state = expireNotes(state, chart, 1300, 220);
    expect(state).toMatchObject({ misses: 1, combo: 0, bestCombo: 1 });
    expect(expireNotes(state, chart, 1400, 220)).toBe(state);
    expect(hitNote(state, chart, 62, 1500, 220)).toMatchObject({ hits: 2, misses: 1, score: 200 });
  });
  it('finishes every authored song with a bounded score and no misses when played on time', () => {
    for (const song of songs) {
      const notes = songChart(song.steps, 90, 60);
      let state = freshRound();
      for (const n of notes) state = hitNote(state, notes, n.note, n.at, hitWindow(90));
      state = expireNotes(state, notes, 999999, hitWindow(90));
      expect(state.hits).toBe(notes.length);
      expect(state.score).toBe(notes.length * 100);
      expect(state.misses).toBe(0);
    }
  });
  it('keeps best scores per song and speed and safely handles corrupt or denied storage', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
    expect(saveGameRecord('song-mary:60', 100).saved).toBe(true);
    expect(saveGameRecord('song-mary:60', 50).best['song-mary:60']).toBe(100);
    expect(saveGameRecord('song-mary:90', 70).best['song-mary:90']).toBe(70);
    values.set('octave-garden.game.v1', '{'); expect(loadGameRecords()).toEqual({});
    vi.stubGlobal('localStorage', { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } });
    expect(saveGameRecord('song-mary:60', 10)).toEqual({ best: { 'song-mary:60': 10 }, saved: false });
  });
});
