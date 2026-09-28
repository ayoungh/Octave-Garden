import type { DeviceProfile, MidiOutputLike } from './types';
// Factory colour-table index closest to the on-screen coral/orange target.
export const GUIDANCE_COLOUR = 11;
/** Ordinary notes and per-key pressure only. No config, SysEx, or program writes. */
export class LightService {
  private sent = new Map<string, { output: MidiOutputLike; notes: Set<string> }>();
  verified = new Set<string>();
  error = '';
  show(notes: number[], profiles: DeviceProfile[], outputs: Map<string, MidiOutputLike>, test = false) {
    let success = this.clear();
    for (const profile of profiles) {
      if (!test && !this.verified.has(profile.outputId)) continue;
      const output = outputs.get(profile.outputId);
      if (!output || output.state !== 'connected') { this.verified.delete(profile.outputId); this.error = 'The light output is disconnected. Reconnect and test the lights again.'; success = false; continue; }
      const record = this.sent.get(output.id) ?? { output, notes: new Set<string>() };
      record.output = output;
      this.sent.set(output.id, record);
      for (const note of notes.map(note => note - (profile.octaveShift ?? 0) * 12).filter(note => note >= profile.low && note <= profile.high)) {
        const key = `${profile.channel}:${note}`;
        if (record.notes.has(key)) continue;
        try {
          output.send([0x90 | profile.channel, note, profile.lightColour ?? GUIDANCE_COLOUR]);
          record.notes.add(key);
          // The factory renderer multiplies colour by a separate per-key brightness.
          // Polyphonic pressure sets that transient brightness without changing config.
          output.send([0xa0 | profile.channel, note, 127]);
        }
        catch { this.verified.delete(output.id); this.error = 'The light message could not be sent. Check your output and test again.'; success = false; }
      }
    }
    return success;
  }
  clear() {
    let success = true;
    for (const [id, record] of this.sent) {
      for (const key of [...record.notes]) {
        const [channel, note] = key.split(':').map(Number);
        try { record.output.send([0x80 | channel, note, 0]); record.notes.delete(key); }
        catch { this.verified.delete(id); this.error = 'The target light could not clear. Reconnect and test the lights again.'; success = false; /* retry a pending note-off after reconnection */ }
      }
      if (!record.notes.size) this.sent.delete(id);
    }
    return success;
  }
  reconnect(outputs: Map<string, MidiOutputLike>) {
    for (const [id, record] of this.sent) { const output = outputs.get(id); if (output) record.output = output; }
    this.clear();
  }
  invalidate() { this.clear(); this.verified.clear(); }
}
