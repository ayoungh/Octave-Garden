export const PIANO_LOW = 21; // A0
export const PIANO_HIGH = 108; // C8
export const isPianoNote = (note: number) => Number.isInteger(note) && note >= PIANO_LOW && note <= PIANO_HIGH;
