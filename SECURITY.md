# Security

Octave Garden is an early local application. Fixes are made on the current `main`
branch; there is no long-term support schedule.

The default server binds to localhost. Do not expose the development server to a
public network. The app requires no credentials, backend or environment secrets.
MIDI permission is requested without SysEx. Browser-local progress is not encrypted
and is accessible to other scripts running on the same origin.

For a vulnerability, use the repository's private vulnerability reporting option
if enabled. Otherwise contact the maintainer through a contact method they list
on their GitHub profile before disclosing exploit details publicly. Include a
minimal reproduction and affected version, and omit personal data and credentials.
Routine audio or MIDI compatibility problems belong in a normal bug report.
