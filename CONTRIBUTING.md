# Contributing

Thanks for wanting to help with Instant Convert.

## Before You Start

- Read the README first so you understand the app structure
- Keep changes small and focused when possible
- Prefer clear code over clever code
- Do not commit generated folders such as `dist`, `node_modules`, or `src-tauri/target`

## What You Can Help With

- Bug reports with clear reproduction steps
- UX improvements
- New file format support
- Better error messages
- Tests and documentation updates

## Development Setup

```bash
npm install
npm run tauri dev
```

If you work on audio or video features, make sure `ffmpeg` is installed locally.

## Pull Requests

Please include:

- A short description of the problem
- The user-visible change
- How you tested it
- Screenshots for UI changes when useful

## Code Style

- Frontend: keep components easy to read and avoid unnecessary abstraction
- Backend: prefer explicit validation and readable error messages
- Shared logic should live in the common helper files, not duplicated in screens

## Maintenance Notes

- Update the documentation when behavior changes
- Preserve the existing UI patterns unless a redesign is intentional

By contributing, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
