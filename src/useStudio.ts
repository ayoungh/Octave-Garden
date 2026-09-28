import { useCallback, useEffect, useRef, useState } from 'react';
import { lessonById, lessonRoot, lessons } from './data/lessons';
import { PianoAudio } from './lib/audio';
import { evaluateNote, newExercise } from './lib/engine';
import { LightService } from './lib/lighting';
import { HeldNotes, MidiService } from './lib/midi';
import { loadState, saveState } from './lib/storage';
import { noteName } from './lib/types';
import type { DeviceProfile, NoteEvent, SavedState, Stage, View } from './lib/types';
import type { Calibration, LightTest } from './components/Setup';

export function useStudio() {
  const [saved, setSaved] = useState(loadState);
  const [view, setView] = useState<View>('learn');
  const [exercise, setExercise] = useState(() => newExercise(saved.step));
  const [held, setHeld] = useState<number[]>([]);
  const [setup, setSetup] = useState(false);
  const [audioStatus, setAudioStatus] = useState<'off' | 'loading' | 'ready' | 'error'>('off');
  const [audioError, setAudioError] = useState('');
  const [midiError, setMidiError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [deviceVersion, setDeviceVersion] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [demoIndex, setDemoIndex] = useState<number | null>(null);
  const [beatOn, setBeatOn] = useState(false);
  const [rhythm, setRhythm] = useState(false);
  const [countIn, setCountIn] = useState<number | null>(null);
  const [timedRunning, setTimedRunning] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [calibration, setCalibration] = useState<Calibration>(null);
  const [calibrationError, setCalibrationError] = useState('');
  const [lastNote, setLastNote] = useState<NoteEvent | null>(null);
  const [changedRanges, setChangedRanges] = useState<string[]>([]);
  const [lightTest, setLightTest] = useState<LightTest>(null);
  const [audio] = useState(() => new PianoAudio());
  const [lights] = useState(() => new LightService());
  const [heldNotes] = useState(() => new HeldNotes());
  const onNoteRef = useRef<(event: NoteEvent) => void>(() => {});
  const onDeviceRef = useRef<(lost: boolean) => void>(() => {});
  const [midi] = useState(() => new MidiService(event => onNoteRef.current(event), lost => onDeviceRef.current(lost)));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const generation = useRef(0);
  const timing = useRef<{ start: number; bpm: number } | undefined>(undefined);
  const savedRef = useRef(saved); savedRef.current = saved;
  const exerciseRef = useRef(exercise); exerciseRef.current = exercise;
  const calibrationRef = useRef(calibration); calibrationRef.current = calibration;
  const previousDevices = useRef('');
  const seenDeviceChange = useRef(false);
  const lesson = lessonById(saved.lessonId);
  const connectedProfiles = saved.devices.filter(profile => midi.access?.inputs.get(profile.inputId)?.state === 'connected');
  const calibratedProfiles = connectedProfiles.filter(profile => profile.calibrated);
  const rangeChanged = connectedProfiles.some(profile => changedRanges.includes(profile.inputId));
  const allLightsVerified = !rangeChanged && calibratedProfiles.length > 0 && calibratedProfiles.length === connectedProfiles.length && calibratedProfiles.every(profile => !!profile.outputId && lights.verified.has(profile.outputId));
  const low = calibratedProfiles.length ? Math.min(...calibratedProfiles.map(p => p.low + (p.octaveShift ?? 0) * 12)) : 60;
  const high = calibratedProfiles.length ? Math.max(...calibratedProfiles.map(p => p.high + (p.octaveShift ?? 0) * 12)) : 83;
  // Choose one actually contiguous input range, never an unplayable gap between devices.
  const roots = calibratedProfiles.length ? calibratedProfiles.map(profile => lessonRoot(profile.low + (profile.octaveShift ?? 0) * 12, profile.high + (profile.octaveShift ?? 0) * 12)).filter((root): root is number => root !== null) : [60];
  const root = roots.sort((a, b) => Math.abs(a - 60) - Math.abs(b - 60))[0] ?? 60;
  const rangeValid = roots.length > 0;
  const step = lesson.steps[Math.min(exercise.index, lesson.steps.length - 1)];
  const targets = (demoIndex !== null ? lesson.steps[demoIndex] : step).notes.map(note => note + root - 60);
  // One source of truth for screen highlights and physical targets, including rests.
  const guideTargets = saved.guidance && !rangeChanged && rangeValid && view === 'learn' && !setup && !paused
    && (playing ? demoIndex !== null : saved.stage !== 'listen' && !exercise.complete) ? targets : [];
  const guideKey = guideTargets.join(',');

  const patch = useCallback((values: Partial<SavedState>) => setSaved(state => ({ ...state, ...values })), []);
  const later = (callback: () => void, delay: number) => { const timer = setTimeout(callback, delay); timers.current.push(timer); };
  const stopTransport = useCallback(() => {
    generation.current++;
    setDeviceVersion(v => v + 1); // Reapply a target after restart, even if its pitch is unchanged.
    timers.current.forEach(clearTimeout); timers.current = [];
    audio.stopDemo(); lights.clear(); setPlaying(false); setDemoIndex(null); setCountIn(null); setTimedRunning(false); timing.current = undefined;
  }, [audio, lights]);
  const silence = useCallback(() => { audio.allOff(); heldNotes.clear(); setHeld([]); lights.clear(); }, [audio, heldNotes, lights]);
  const allOff = useCallback(() => { stopTransport(); silence(); setBeatOn(false); setPaused(true); }, [stopTransport, silence]);

  useEffect(() => { setStorageFailed(!saveState(saved)); }, [saved]);
  useEffect(() => { audio.volume(saved.volume); }, [audio, saved.volume]);
  useEffect(() => {
    function onHidden() { if (document.hidden) allOff(); }
    const onBlur = () => allOff();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', allOff);
    return () => { document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('blur', onBlur); window.removeEventListener('pagehide', allOff); };
  }, [allOff]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); audio.dispose(); midi.dispose(); lights.invalidate(); }, [audio, midi, lights]);

  async function enableAudio() {
    setAudioStatus('loading'); setAudioError('');
    try { await audio.start(); setAudioStatus('ready'); for (const note of heldNotes.notes()) audio.on(note, 0.65); return true; }
    catch (error) { setAudioStatus('error'); setAudioError(error instanceof Error ? error.message : 'The piano could not start. Please retry.'); return false; }
  }
  async function restartAudio() { allOff(); audio.dispose(); return enableAudio(); }
  async function testAudio() {
    allOff(); const token = generation.current;
    if (!await enableAudio() || token !== generation.current) return;
    [60, 64, 67].forEach((note, i) => later(() => audio.demonstrate(note, 0.55), i * 700));
  }
  const enableRef = useRef(enableAudio); enableRef.current = enableAudio;
  onDeviceRef.current = lost => {
    const signature = [...(midi.access?.inputs.values() ?? []), ...(midi.access?.outputs.values() ?? [])].map(port => `${port.id}:${port.state}`).join('|');
    const changed = signature !== previousDevices.current;
    if (changed && seenDeviceChange.current) { lights.invalidate(); setLightTest(null); if (savedRef.current.devices.length) allOff(); }
    previousDevices.current = signature; seenDeviceChange.current = true;
    if (lost) allOff();
    // Opening a connected Web MIDI port also emits statechange. It is not a
    // reconnection and must not clear an in-progress hardware light test.
    if (midi.access && changed) lights.reconnect(midi.access.outputs);
    setDeviceVersion(v => v + 1);
  };
  onNoteRef.current = event => {
    if (!event.source.startsWith('screen:')) setLastNote(event);
    const profile = savedRef.current.devices.find(device => device.inputId === event.source);
    if (!calibrationRef.current && profile?.calibrated && event.type === 'on' && (event.note < profile.low || event.note > profile.high) && !changedRanges.includes(event.source)) {
      setChangedRanges(previous => [...new Set([...previous, event.source])]); lights.invalidate(); setLightTest(null); allOff(); return;
    }
    const logical = heldNotes.process({ ...event, note: event.note + (profile?.octaveShift ?? 0) * 12 });
    setHeld(heldNotes.notes());
    if (logical?.type === 'on') audio.on(logical.note, logical.velocity);
    if (logical?.type === 'off') audio.off(logical.note);
    const calibrationNow = calibrationRef.current;
    if (calibrationNow && event.source === calibrationNow.inputId && event.type === 'on') {
      if (calibrationNow.phase === 'low') { const next: Calibration = { ...calibrationNow, phase: 'high', low: event.note }; calibrationRef.current = next; setCalibration(next); setCalibrationError(''); }
      else if (event.note <= (calibrationNow.low ?? 0)) setCalibrationError('Press a higher key for the upper end of the range.');
      else { patch({ devices: savedRef.current.devices.map(profile => profile.inputId === event.source ? { ...profile, low: calibrationNow.low!, high: event.note, calibrated: true } : profile) }); calibrationRef.current = null; setCalibration(null); setCalibrationError(''); setChangedRanges(previous => previous.filter(id => id !== event.source)); lights.invalidate(); }
      return;
    }
    if (!logical || rangeChanged || setup || view !== 'learn' || saved.stage !== 'try' || paused || playing || exerciseRef.current.complete || !rangeValid || (rhythm && !timing.current)) return;
    const next = evaluateNote(exerciseRef.current, logical, lesson.steps, root, rhythm ? timing.current : undefined);
    exerciseRef.current = next; setExercise(next);
    if (next.index !== exercise.index) patch({ step: next.complete ? 0 : next.index });
    if (next.complete) {
      stopTransport();
      setSaved(state => ({ ...state, step: 0, completed: [...new Set([...state.completed, lesson.id])], sessions: [...state.sessions, { lessonId: lesson.id, date: new Date().toISOString(), correct: next.correct, mistakes: next.mistakes, mode: rhythm ? 'rhythm' : 'wait' }].slice(-100) as SavedState['sessions'] }));
    }
  };

  function screenDown(note: number, source: string) { if (audioStatus === 'off' || audioStatus === 'error') void enableAudio(); onNoteRef.current({ type: 'on', note, velocity: 0.65, time: performance.now(), source: `screen:${source}`, channel: 0 }); }
  function screenUp(note: number, source: string) { onNoteRef.current({ type: 'off', note, velocity: 0, time: performance.now(), source: `screen:${source}`, channel: 0 }); }
  useEffect(() => {
    const keys = 'awsedftgyhujk';
    const down = (event: KeyboardEvent) => {
      if (view !== 'free' || setup || event.metaKey || event.ctrlKey || event.altKey || event.repeat || (event.target as HTMLElement).matches('input,select,textarea,button')) return;
      const index = keys.indexOf(event.key.toLowerCase()); if (index < 0) return;
      event.preventDefault(); if (!audio.ready) void enableRef.current();
      onNoteRef.current({ type: 'on', note: root + index, velocity: 0.65, time: performance.now(), source: `screen:typing-${event.code}`, channel: 0 });
    };
    const up = (event: KeyboardEvent) => { const index = keys.indexOf(event.key.toLowerCase()); if (index >= 0) onNoteRef.current({ type: 'off', note: root + index, velocity: 0, time: performance.now(), source: `screen:typing-${event.code}`, channel: 0 }); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [view, setup, root, audio]);

  // Lighting output never enters the learner input path or drives the audio engine.
  useEffect(() => {
    if (setup) return; // The explicit setup test owns the output while this panel is open.
    if (allLightsVerified && guideTargets.length && midi.access) {
      if (!lights.show(guideTargets, calibratedProfiles, midi.access.outputs)) setDeviceVersion(v => v + 1);
    } else lights.clear();
    return () => { lights.clear(); };
  // The serialised target list avoids retransmitting on unrelated UI updates.
  }, [guideKey, allLightsVerified, setup, saved.lessonId, saved.stage, exercise.index, deviceVersion, saved.devices, lights, midi]);

  useEffect(() => {
    if (!beatOn || audioStatus !== 'ready' || playing || timedRunning || paused) return;
    let beat = 0;
    audio.beat(true);
    const interval = setInterval(() => audio.beat(++beat % 4 === 0), 60000 / saved.bpm);
    return () => clearInterval(interval);
  }, [beatOn, audioStatus, saved.bpm, playing, timedRunning, paused, audio]);

  function openLesson(id: string) { stopTransport(); silence(); setPaused(false); setRhythm(false); patch({ lessonId: id, stage: 'learn', step: 0 }); setExercise(newExercise()); setView('learn'); }
  function changeView(next: View) { stopTransport(); silence(); setPaused(false); setView(next); }
  function changeStage(stage: Stage) { stopTransport(); silence(); setPaused(false); patch({ stage }); }
  function restart() { stopTransport(); silence(); setExercise(newExercise()); exerciseRef.current = newExercise(); patch({ step: 0 }); setPaused(false); }
  async function demonstrate() {
    if (playing) { allOff(); return; }
    stopTransport(); silence(); setPaused(false);
    const token = generation.current;
    if (!await enableAudio() || generation.current !== token) return;
    setPlaying(true);
    let elapsed = 0;
    const beat = 60000 / saved.bpm;
    lesson.steps.forEach((s, i) => {
      const at = elapsed;
      later(() => { setDemoIndex(i); for (const note of s.notes) audio.demonstrate(note + root - 60, s.beats * beat / 1000 * 0.8); }, at);
      later(() => setDemoIndex(null), at + s.beats * beat * 0.8);
      elapsed += s.beats * beat;
    });
    later(() => { stopTransport(); }, elapsed + 100);
  }
  async function beginRhythm() {
    restart(); const token = generation.current;
    if (!await enableAudio() || generation.current !== token) return;
    const beat = 60000 / saved.bpm;
    timing.current = { start: performance.now() + beat * 4, bpm: saved.bpm };
    setTimedRunning(true); setCountIn(4);
    for (let i = 0; i < 4 + lesson.steps.length; i++) later(() => { audio.beat(i % 4 === 0); setCountIn(i < 4 ? 4 - i : null); }, i * beat);
    later(() => { if (!exerciseRef.current.complete) { setPaused(true); setExercise(s => ({ ...s, message: 'That round is finished. Start again whenever you’re ready.' })); } stopTransport(); }, (4 + lesson.steps.length) * beat + 350);
  }
  async function connectMidi() {
    setConnecting(true); setMidiError('');
    try { await midi.connect(); midi.select(savedRef.current.devices.map(p => p.inputId)); }
    catch (error) { setMidiError(error instanceof DOMException && error.name === 'NotAllowedError' ? 'MIDI permission was declined. Allow MIDI for localhost in Chrome’s site settings, then try again.' : error instanceof Error ? error.message : 'MIDI could not connect. Please retry.'); }
    finally { setConnecting(false); }
  }
  function changeProfiles(profiles: DeviceProfile[]) { allOff(); lights.invalidate(); setLightTest(null); setCalibration(null); calibrationRef.current = null; patch({ devices: profiles }); midi.select(profiles.map(p => p.inputId)); }
  function calibrate(value: Calibration) { silence(); setCalibrationError(''); calibrationRef.current = value; setCalibration(value); }
  function testLight(profile: DeviceProfile, semitone = 0) {
    stopTransport(); lights.error = '';
    const c = Math.ceil(profile.low / 12) * 12 + semitone;
    if (c > profile.high || !midi.access) { setCalibrationError('This test note is outside the range. Recalibrate the entire keyboard.'); return; }
    const success = lights.show([c + (profile.octaveShift ?? 0) * 12], [profile], midi.access.outputs, true);
    setLightTest({ outputId: profile.outputId, note: c, status: success ? 'running' : 'failed' });
    if (success) later(() => { const cleared = lights.clear(); setLightTest({ outputId: profile.outputId, note: c, status: cleared ? 'confirm' : 'failed' }); }, 6000);
  }
  function confirmLight(success: boolean) {
    if (!lightTest || lightTest.status !== 'confirm') return;
    if (success) lights.verified.add(lightTest.outputId); else lights.verified.delete(lightTest.outputId);
    setLightTest({ ...lightTest, status: success ? 'passed' : 'failed' }); setDeviceVersion(v => v + 1);
  }
  function openSetup() { allOff(); setSetup(true); setLightTest(null); }
  function closeSetup() { stopTransport(); silence(); setCalibration(null); calibrationRef.current = null; setSetup(false); setPaused(false); }
  function resume() { silence(); setPaused(false); }
  function toggleBeat() { if (!beatOn) { setPaused(false); void enableAudio(); } setBeatOn(v => !v); }
  const nextLesson = lessons[lessons.findIndex(l => l.id === lesson.id) + 1];
  const instruction = exercise.complete ? 'A little practice. Real progress.' : `Play ${noteName(targets[0])} with your right ${['', 'thumb', 'index finger', 'middle finger', 'ring finger', 'little finger'][step.fingers?.[0] ?? 1]}`;
  return { saved, patch, view, changeView, exercise, lesson, step, root, low, high, rangeValid, rangeChanged, targets, guideTargets, held, setup, openSetup, closeSetup, audioStatus, audioError, enableAudio, restartAudio, testAudio, midiError, connecting, connectMidi, access: midi.access, connectedProfiles, deviceVersion, paused, resume, playing, demoIndex, demonstrate, beatOn, toggleBeat, rhythm, setRhythm: (value: boolean) => { restart(); setRhythm(value); }, countIn, timedRunning, beginRhythm, storageFailed, calibration, calibrate, calibrationError, lastNote, lightTest, testLight, confirmLight, verified: lights.verified, lightingError: lights.error, allLightsVerified, changeProfiles, openLesson, changeStage, restart, allOff, screenDown, screenUp, nextLesson, instruction };
}
