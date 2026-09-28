import { useEffect, useRef } from 'react';
import { Bluetooth, Cable, Check, ChevronRight, X, Radio, Lightbulb, RotateCcw } from 'lucide-react';
import type { DeviceProfile, MidiAccessLike, NoteEvent } from '../lib/types';
import { noteName } from '../lib/types';
import { PIANO_LOW, PIANO_HIGH } from '../lib/pianoRange';
export type Calibration = { inputId: string; phase: 'low' | 'high'; low?: number } | null;
export type LightTest = { outputId: string; status: 'running' | 'confirm' | 'passed' | 'failed'; note: number } | null;
type Props = {
  audioStatus: 'off' | 'loading' | 'ready' | 'error'; restartAudio: () => void; testAudio: () => void;
  close: () => void; connect: () => void; connecting: boolean; midiError: string; access: MidiAccessLike | null; profiles: DeviceProfile[]; change: (profiles: DeviceProfile[]) => void;
  calibration: Calibration; calibrate: (value: Calibration) => void; calibrationError: string; lastNote: NoteEvent | null;
  test: LightTest; testLight: (profile: DeviceProfile, semitone?: number) => void; confirmLight: (success: boolean) => void; verified: Set<string>;
};
export function Setup(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); return () => { dialog.current?.close(); }; }, []);
  const inputs = [...(props.access?.inputs.values() ?? [])].filter(input => input.state === 'connected');
  const outputs = [...(props.access?.outputs.values() ?? [])].filter(output => output.state === 'connected');
  const overlap = props.profiles.length === 2 && props.profiles.every(p => p.calibrated) && Math.max(...props.profiles.map(p => p.low)) <= Math.min(...props.profiles.map(p => p.high));
  function update(inputId: string, patch: Partial<DeviceProfile>) { props.change(props.profiles.map(profile => profile.inputId === inputId ? { ...profile, ...patch } : profile)); }
  return <dialog ref={dialog} className="setup-dialog" onCancel={event => { event.preventDefault(); props.close(); }} onClick={event => { if (event.target === event.currentTarget) props.close(); }}>
    <div className="dialog-heading"><div><span className="eyebrow">YOUR INSTRUMENT</span><h2>Keyboard setup</h2></div><button className="icon-button" onClick={props.close} aria-label="Close keyboard setup"><X size={21}/></button></div>
    <div className="setup-body">
      <div className="button-row"><h3>Piano sound</h3><button onClick={props.restartAudio} disabled={props.audioStatus === 'loading'}><RotateCcw size={16}/>{props.audioStatus === 'loading' ? 'Starting piano…' : props.audioStatus === 'off' ? 'Enable piano' : 'Restart piano'}</button><button onClick={props.testAudio} disabled={props.audioStatus === 'loading'}>Play sound check</button></div>
      <p className="muted small">If sound becomes crackly, restart the piano here. Your lesson and MIDI selection stay saved. The sound check plays middle C, E and G regardless of the keyboard’s octave setting.</p>
      <div className="pairing-guide"><Bluetooth size={24}/><div><h3>Connect with Bluetooth MIDI</h3><p>Turn on your LUMI, then open <strong>Audio MIDI Setup</strong> on your Mac.</p><p className="setup-path">Window <ChevronRight/> Show MIDI Studio <ChevronRight/> MIDI Studio <ChevronRight/> Open Bluetooth Configuration</p><p>Click Connect beside your LUMI. Return here when it’s connected.</p></div></div>
      <button className="primary" onClick={props.connect} disabled={props.connecting}><Cable size={17}/>{props.connecting ? 'Connecting…' : props.access ? 'Refresh MIDI devices' : 'Enable MIDI access'}</button>
      {props.midiError && <p className="error-message" role="alert">{props.midiError}</p>}
      {props.access && !inputs.length && <div className="empty-inline"><Radio size={20}/><p>No MIDI inputs yet. Connect in Audio MIDI Setup; this list updates automatically.</p></div>}
      {inputs.length > 0 && <><h3 className="setup-section-heading">Choose your keyboard inputs</h3><p className="muted small">Select up to two. Choose one connection per instrument to avoid duplicate USB and Bluetooth input.</p></>}
      {inputs.map(input => { const profile = props.profiles.find(p => p.inputId === input.id); return <div className="device-card" key={input.id}>
        <label className="device-title"><input type="checkbox" checked={!!profile} disabled={!profile && props.profiles.length >= 2} onChange={event => props.change(event.target.checked ? [...props.profiles, { inputId: input.id, outputId: '', low: 48, high: 71, calibrated: false, channel: 0 }] : props.profiles.filter(p => p.inputId !== input.id))}/><span>{input.name || 'MIDI keyboard'}</span><span className="connected-dot"/></label>
        {profile && <div className="device-options">
          <label>Light output<select value={profile.outputId} onChange={event => update(input.id, { outputId: event.target.value })}><option value="">Choose matching output</option>{outputs.map(output => <option key={output.id} value={output.id}>{output.name || 'MIDI output'}</option>)}</select></label>
          <label>Output channel<select value={profile.channel} onChange={event => update(input.id, { channel: Number(event.target.value) })}>{Array.from({ length: 16 }, (_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></label>
          <div className="range-row"><span>{profile.calibrated ? `${noteName(profile.low, true)} – ${noteName(profile.high, true)} · ${profile.high - profile.low + 1} keys` : 'Calibrate your keyboard’s range'}</span><button className="quiet-button" onClick={() => props.calibrate({ inputId: input.id, phase: 'low' })}><RotateCcw size={14}/>{profile.calibrated ? 'Recalibrate' : 'Calibrate'}</button></div>
          <p className="muted small">Recommended beginner range: C4–B5, with middle C at the far left. The LUMI’s arrow buttons shift every key down or up an octave. Recalibrate after using them so the on-screen notes and physical lights still match.</p>
          {profile.calibrated && (profile.low + (profile.octaveShift ?? 0) * 12 < PIANO_LOW || profile.high + (profile.octaveShift ?? 0) * 12 > PIANO_HIGH) && <p className="notice" role="status">Part of this range is outside the piano’s A0–C8 range and will be silent. <button className="text-button" onClick={() => update(input.id, { octaveShift: Math.round((60 - profile.low) / 12) })}>Use a comfortable piano range</button> to adjust the sound in this app. Your keyboard’s settings stay unchanged.</p>}
          {props.calibration?.inputId === input.id && <div className="calibration-prompt" role="status"><span className="pulse-dot"/>Press the <strong>{props.calibration.phase === 'low' ? 'lowest' : 'highest'}</strong> physical key on this keyboard.<button className="text-button" onClick={() => props.calibrate(null)}>Cancel</button></div>}
          {profile.calibrated && <label>Piano octave in this app<select value={profile.octaveShift ?? 0} onChange={event => update(input.id, { octaveShift: Number(event.target.value) })}>{Array.from({ length: 21 }, (_, i) => i - 10).filter(shift => shift === (profile.octaveShift ?? 0) || (profile.low + shift * 12 >= PIANO_LOW && profile.high + shift * 12 <= PIANO_HIGH)).map(shift => <option key={shift} value={shift}>{shift > 0 ? '+' : ''}{shift} · {noteName(profile.low + shift * 12, true)}–{noteName(profile.high + shift * 12, true)}</option>)}</select></label>}
          <label>Target light colour<select value={profile.lightColour ?? 11} onChange={event => update(input.id, { lightColour: Number(event.target.value) })}><option value={11}>Coral</option><option value={40}>Gold</option><option value={127}>White</option></select></label>
          <div className="light-row"><button disabled={!profile.outputId || !profile.calibrated || props.test?.status === 'running'} onClick={() => props.testLight(profile)}><Lightbulb size={16}/>Test C light</button><button disabled={!profile.outputId || !profile.calibrated || props.test?.status === 'running'} onClick={() => props.testLight(profile, 4)}>Test E light</button><span className={props.verified.has(profile.outputId) ? 'success-text' : 'muted'}>{props.verified.has(profile.outputId) ? 'Verified this connection' : 'Not verified'}</span></div>
          {props.test?.outputId === profile.outputId && <div className="light-result" role="status">
            {props.test.status === 'running' && <p>Lighting {noteName(props.test.note, true)} for six seconds, then restoring its resting colour…</p>}
            {props.test.status === 'confirm' && <><p>Did {noteName(props.test.note, true)} change to the selected colour, then return to normal? Other C keys may already have factory root-note colours. The E test avoids those resting markers.</p><div className="button-row"><button className="primary" onClick={() => props.confirmLight(true)}><Check size={16}/>Yes, it worked</button><button onClick={() => props.confirmLight(false)}>No, unavailable</button></div></>}
            {props.test.status === 'passed' && <p className="success-text">Physical guidance is ready. The LUMI target follows the highlighted on-screen key in lessons and songs. Your factory program is unchanged.</p>}
            {props.test.status === 'failed' && <p>Physical lights are unavailable on this connection. On-screen guidance still works. Check the matching output and channel before retrying.</p>}
          </div>}
        </div>}
      </div>; })}
      {props.profiles.some(profile => !inputs.some(input => input.id === profile.inputId)) && <p className="notice">A saved keyboard is disconnected. Reconnect it, or <button className="text-button" onClick={() => props.change(props.profiles.filter(profile => inputs.some(input => input.id === profile.inputId)))}>remove the saved selection</button>.</p>}
      {props.calibrationError && <p className="error-message" role="alert">{props.calibrationError}</p>}
      {overlap && <p className="notice">Both units currently share some notes. Use their octave buttons to make adjacent ranges, then recalibrate. Shared pitches sound once.</p>}
      <div className="input-monitor"><span className="eyebrow">INPUT CHECK</span><strong>{props.lastNote ? `${noteName(props.lastNote.note, true)} ${props.lastNote.type === 'on' ? 'pressed' : 'released'}` : 'Play a key to check input'}</strong><span className="muted small">{props.lastNote ? `Channel ${props.lastNote.channel + 1}` : 'MIDI notes appear here after selecting an input.'}</span></div>
      <p className="muted small">Use laptop speakers or wired headphones. Bluetooth headphones can add noticeable delay. No firmware or keyboard settings are changed.</p>
    </div><div className="dialog-footer"><span className="muted small">You can also practise with the on-screen keys.</span><button className="primary" onClick={props.close}>Back to piano</button></div>
  </dialog>;
}
