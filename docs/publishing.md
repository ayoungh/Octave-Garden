# Publish the repository on GitHub

The repository root is the `octave-garden` folder, not its parent playground.
No GitHub account, remote URL or maintainer email is hard-coded into the project.

Before the first push, run:

```sh
npm ci
npm run check
git status --short
git add .
git diff --cached --stat
git commit -m "Introduce Octave Garden piano studio"
```

Review the staged files before committing. Dependency folders, builds, local
history, logs and environment files are ignored. Public documentation describes
physical lighting as experimental and currently unverified for song guidance.

Using the GitHub CLI, after signing in to the intended account:

```sh
gh repo create octave-garden --public --source=. --remote=origin --push
```

Alternatively, create an empty GitHub repository named `octave-garden` without an
automatically generated README or licence, then follow its **push an existing
repository** instructions. Do not add a second initial commit on GitHub.

Suggested repository description:

> A local piano-learning studio with beginner lessons, songs and MIDI keyboard support. No accounts or telemetry.

Suggested topics: `piano`, `music-education`, `web-midi`, `local-first`, `react`,
`typescript`, `roli-lumi`.

After pushing, check the **Check** workflow. Consider enabling private vulnerability
reporting under the repository's security settings. Publishing the source does not
host the app; localhost remains the supported way to run it.
