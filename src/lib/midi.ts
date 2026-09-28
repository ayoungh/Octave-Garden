import type { MidiAccessLike, NoteEvent } from './types';
export function parseMidi(data: Uint8Array, source: string, time: number): NoteEvent | null {
  if (data.length < 3) return null;
  const status = data[0] & 0xf0;
  if (status !== 0x80 && status !== 0x90 || data[1] > 127 || data[2] > 127) return null;
  return { type: status === 0x80 || data[2] === 0 ? 'off' : 'on', note: data[1], velocity: data[2] / 127, channel: data[0] & 15, source, time };
}
/** Aggregate voices across ports/channels; overlapping notes need every source to release. */
export class HeldNotes {
  private voices = new Map<string, number>();
  process(event: NoteEvent): NoteEvent | null {
    const key = `${event.source}:${event.channel}:${event.note}`;
    const wasHeld = [...this.voices.values()].includes(event.note);
    if (event.type === 'on') {
      if (this.voices.has(key)) return null;
      this.voices.set(key, event.note);
      return wasHeld ? null : event;
    }
    if (!this.voices.delete(key)) return null;
    return [...this.voices.values()].includes(event.note) ? null : event;
  }
  clear() { this.voices.clear(); }
  notes() { return [...new Set(this.voices.values())]; }
}
export class MidiService {
  access: MidiAccessLike | null = null;
  private selected = new Set<string>();
  private available = new Set<string>();
  constructor(private onNote: (event: NoteEvent) => void, private onChange: (lost: boolean) => void) {}
  async connect(request?: () => Promise<MidiAccessLike>) {
    const navigatorMidi = navigator as unknown as { requestMIDIAccess?: (options: { sysex: boolean }) => Promise<MidiAccessLike> };
    const getAccess = request ?? (navigatorMidi.requestMIDIAccess ? () => navigatorMidi.requestMIDIAccess!({ sysex: false }) : undefined);
    if (!getAccess) throw new Error('This browser does not support Web MIDI. Open Octave Garden in Chrome on your Mac.');
    const access = await getAccess();
    this.dispose();
    this.access = access;
    this.access.onstatechange = () => this.refresh();
    this.refresh();
  }
  select(ids: string[]) { this.selected = new Set(ids); this.refresh(); }
  private refresh() {
    if (!this.access) return;
    const next = new Set<string>();
    for (const input of this.access.inputs.values()) {
      const active = this.selected.has(input.id) && input.state === 'connected';
      if (active) next.add(input.id);
      input.onmidimessage = active ? ({ data, timeStamp }) => { const event = parseMidi(data, input.id, timeStamp); if (event) this.onNote(event); } : null;
    }
    const lost = [...this.available].some(id => !next.has(id));
    this.available = next;
    this.onChange(lost);
  }
  dispose() { if (this.access) { this.access.onstatechange = null; for (const input of this.access.inputs.values()) input.onmidimessage = null; } }
}
