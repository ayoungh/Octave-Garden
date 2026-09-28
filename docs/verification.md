# Verification and known limitations

Status as of 28 September 2026, version 0.1.0.

## Automated checks

61 tests pass across five files. The TypeScript check and Vite production build
pass. Tests use simulated MIDI ports and mocked audio where appropriate; they are
not proof of physical sound, latency or light behaviour.

| Area | Coverage |
| --- | --- |
| Learning | Correct/wrong notes, fresh repeated presses, note-offs, rhythm timing, transposition, all lessons and songs |
| Song game | Authored beat spacing, timing windows, repeated notes, misses, all seven songs, count-in, pause/resume, cancellation, normalized MIDI routing and best-score persistence |
| MIDI | Multiple channels, velocity-zero note-offs, overlapping sources, permission denial, unavailable API, missing devices, disconnect/reconnect |
| Lights | Confirmation gate, output/channel/range routing, clearing/retry, demo gaps, restart, colour selection and failed note-off |
| Port lifecycle | Opening a connected Web MIDI output does not clear an active light test |
| Audio | Startup coalescing, failed loading, restart/disposal, cancellation, duplicate voices and piano-range limits |
| Storage | Completion, lesson position, preference validation and corrupt/old state recovery |

GitHub Actions is configured to run tests and builds on Node 22 and 24. A remote
CI run can only be confirmed after the repository is pushed.

## Browser evidence

The learning flow has been exercised with on-screen keys, including wrong notes,
repeated presses, song phrase transitions, completion and saved progress. Listen,
Free play, rhythm count-in and treble-staff views have been checked. Prior layout
checks covered 1536×1024, 1280×720 and 390×844; the keyboard scrolls independently
on narrow screens. Public screenshots use synthetic practice data in a separate
preview browser, not the hardware user's saved progress.

The Octave Garden rename was checked at 1280×720 and 390×844, with no horizontal
document overflow at the mobile width and no captured browser warnings/errors.
The local credits page was verified. A clean `npm ci --offline --no-audit --no-fund`
from the publishable files succeeded using the local npm cache, followed by all
46 tests and the production build on Node 25.8.2. This is separate from the Node
22/24 GitHub CI matrix, which has not yet run remotely.

The Play game was checked at 1280×720 and 390×844. A computer-key press and an
on-screen piano press each earned a Perfect hit during live falling-note rounds.
Pause froze song progress, resume continued it, a round reached its results, and
its best score survived a page reload. Song/speed selection, reset, All notes off,
and returning to the matching untimed lesson were exercised. Mobile scrolling
keeps the lanes and piano aligned, with no horizontal document overflow. No
browser warnings or errors were captured during these checks. New game MIDI
coverage is simulated; playing this mode with a real LUMI remains to be verified.
Physical light guidance is not enabled in Play mode.

The sidebar navigation update was checked on desktop and at 390×844: all four
modes replace the sidebar content, choosing a Play song stays in the game and
resets an active round, and mobile song selection closes the menu. Play and Free
play both rendered the same 24-key C4–B5 range and 164px keyboard height at the
laptop viewport. Falling-note centres aligned with the matching white keys to
within one pixel. The shared range also follows configured MIDI profiles; this
change did not include new physical-device acceptance.

All 30 piano samples loaded from localhost (2,012,677 bytes). Fonts and lessons are
bundled. The app's Content Security Policy restricts runtime connections to the
local origin (plus the local development WebSocket). A full test with the Mac's
external networking disabled has not yet been performed. The local server must
stay running; this is not a service-worker-cached PWA.

## Hardware evidence

| Capability | Observed result |
| --- | --- |
| One LUMI, Bluetooth input in Chrome/macOS | Notes received and range calibration worked |
| Piano sound from physical keys | Confirmed audible and normal after correcting an octave shift |
| Range display | C4–B5 displayed after calibration; octave arrows require recalibration |
| Physical target lighting | **Not working reliably on the tested connection** |
| Two units / joined topology | Not hardware-verified |
| Physical disconnect recovery / sustained latency | Not fully hardware-verified |

An isolated C colour-change report did not generalize to song guidance. The E4
song target and explicit E light tests left only the two resting C markers visible.
Gold colour, separate per-key brightness and a fix for premature clearing on
port-open events did not establish working guidance. The final test was marked
unavailable. Firmware details and the cause remain unresolved.

In the Learn view, screen highlights and outgoing guidance share the same target list. The code uses
the published factory MIDI handler, with no firmware, custom-program or SysEx
configuration writes. Do not remove the visual confirmation gate or advertise
working physical song guidance until it is demonstrated on actual hardware.

## Useful next checks

1. Compare the same E test over USB and Bluetooth, recording firmware and output
   channel. Confirm a non-C target, its clearing, and E–D–C song progression.
2. Verify two units, both joined and separately exposed, including adjacent ranges.
3. Check held-note cleanup and light-test invalidation after a real disconnection.
4. Build and serve locally, disable external networking while leaving Bluetooth
   enabled, and complete a lesson using the locally bundled sound.
5. Expand keyboard, screen-reader and touch testing beyond the current Chrome target.
