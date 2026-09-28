# Contributing to Octave Garden

Small fixes, beginner-friendly lessons, accessibility improvements and reproducible
hardware reports are welcome. Open an issue before undertaking a large feature.
Be patient and respectful: this app is intended for people who are new to piano.

## Local setup

Use Node 22.13+ (22.x) or 24+, run `npm ci`, then `npm run dev` and visit
http://localhost:5184. No credentials or environment file are required.
Before submitting a change, run `npm run check`. CI repeats the tests and build on
Node 22 and 24; physical devices are not attached to CI.

## Code map

| Location | Responsibility |
| --- | --- |
| `src/data/` | Typed lessons and song arrangements |
| `src/lib/midi.ts` | MIDI parsing, port selection and held-note aggregation |
| `src/lib/lighting.ts` | Experimental factory MIDI lighting and cleanup |
| `src/lib/audio.ts` | Local sample playback, voices and audio lifecycle |
| `src/lib/engine.ts` | Note evaluation and lesson progression |
| `src/lib/game.ts` | Song charts, timing judgments and local game records |
| `src/useGame.ts` | Game clock, count-in, pause/resume and input bridge |
| `src/lib/storage.ts` | Versioned local progress and preferences |
| `src/useStudio.ts` | Coordination of UI, input, audio and lessons |
| `src/components/` | Keyboard, staff, timeline, setup and progress views |
| `tests/` | Pure logic and hook tests with simulated MIDI/audio |
| `public/` | Local samples, credits and static assets |

Keep learner MIDI events separate from demonstration and lighting output. Preserve
fresh-press behaviour for repeated notes, source/channel-aware releases, audio
cleanup and the hardware light-test gate. Do not add remote services, telemetry,
firmware uploads or device configuration writes without discussing the change.

## Lessons and assets

Use typed lesson steps with notes, beats, instructional text and optional
fingering. Keep beginner lessons playable on one 24-key keyboard. For songs,
record provenance and use original or suitably licensed arrangements. Credit
third-party assets, include their licences, and regenerate notices when changing
production dependencies. Never add personal recordings or unlicensed song files.

## Verification and pull requests

Add focused regression tests for changes to MIDI, audio, storage or lesson logic.
Check UI changes in Chrome at laptop and narrow mobile sizes; include a screenshot
with synthetic practice data. Describe the problem, the resulting behaviour and
how you tested it. Avoid unrelated refactoring.

Hardware reports should state keyboard model, firmware if known, OS/browser,
USB versus Bluetooth, calibrated range and output channel. Separate what was
visible on screen from what the physical keyboard did. Sending MIDI without an
error is not proof of correct lights. Do not post serial numbers, local storage
exports, personal paths or other private data.

Contributions to project code and authored lessons use the repository's MIT
licence; third-party assets keep their existing terms.
