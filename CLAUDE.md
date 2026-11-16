# Rules for Claude Code in this repository

1. **The founder is not a software engineer.** Explain plainly, one step at a time. Ask before installing anything, using sudo, deleting files, or doing anything hard to undo.
2. **Product decisions are made in the Claude Project** and recorded in `docs/` (Decisions Log, Requirements, Roadmap). Do not make product decisions. If a request conflicts with `docs/`, stop and say so.
3. **Calculation and interpretation are strictly separate.** `packages/engine` contains calculations only (no UI, no interpretation text). `packages/content` contains interpretation text as data only.
4. **Never write astronomical calculations from scratch.** Use Swiss Ephemeris (AGPL). Results must match the Jagannatha Hora reference tests in `tests/reference`; any engine change must keep all reference tests passing.
5. **The repository is PUBLIC.** Never commit secrets, API keys, `.env` files, or real people's birth details.
6. **Branching:** every change happens on a feature branch with a pull request. Never push directly to `main`. (The initial setup was the only exception.)
7. **Never merge a pull request with failing checks.**
8. **Health-related content is general wellness only**, with a disclaimer. Never medical advice.
9. **Zero budget:** do not add paid services, analytics, trackers, or cookies without explicit approval.
