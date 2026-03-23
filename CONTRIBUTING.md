# Contributing

Thanks for considering a contribution to Instant Convert.

## How To Help

- report bugs with clear reproduction steps
- suggest UX improvements
- improve conversion support or error handling
- add tests and polish documentation

## Development Setup

```bash
npm install
npm run tauri dev
```

Make sure `ffmpeg` is installed locally if you work on audio or video conversion.

## Guidelines

- keep changes focused and small when possible
- preserve existing UI patterns unless a redesign is intentional
- do not commit generated folders such as `dist`, `node_modules` or `src-tauri/target`
- update documentation when behavior changes

## Pull Requests

- explain the problem being solved
- describe the user-visible change
- include verification steps
- attach screenshots for UI changes when relevant

## Code Style

- frontend: keep components readable and avoid unnecessary abstraction
- backend: prefer clear error messages and explicit format validation

By participating in this project, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
