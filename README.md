# Instant Convert

Instant Convert is a desktop toolbox built with Tauri, React and Rust for handling common file workflows locally.

The app currently includes:

- file conversion for images, audio and video
- image reduction and optional grayscale export
- PDF merge
- ZIP compression
- OCR extraction from images

Everything runs locally on the machine. Audio and video conversion rely on `ffmpeg`.

## Features

- Convert image formats such as `png`, `jpg`, `jpeg`, `webp`, `bmp`, `gif`, `tiff` and `pdf` output from images
- Convert audio formats such as `mp3`, `wav`, `flac`, `ogg`, `opus`, `m4a`, `aac`, `wma`, `aiff`
- Convert video formats such as `mp4`, `mkv`, `mov`, `avi`, `webm`, `flv`, `wmv`, `m4v`, `mpg`, `mpeg`, `ts`, `3gp`, `ogv`
- Merge multiple PDFs into one file
- Compress files and folders into ZIP archives
- Reduce image dimensions in batch
- Run OCR on images with local models

## Stack

- Tauri 2
- React 19 + Vite
- Rust
- `ffmpeg` for audio and video transcoding

## Requirements

- Node.js 20+ recommended
- Rust toolchain
- Tauri system prerequisites
- `ffmpeg` available in `PATH` for audio/video conversion

## Development

Install dependencies:

```bash
npm install
```

Run the web frontend:

```bash
npm run dev
```

Run the desktop app:

```bash
npm run tauri dev
```

Build the frontend:

```bash
npm run build
```

Build the desktop app:

```bash
npm run tauri build
```

## Notes

- OCR models are stored in `src-tauri/models`.
- If `ffmpeg` is missing, audio and video conversions will fail.
- Generated folders such as `dist`, `node_modules` and `src-tauri/target` should not be committed.

## Open Source

This project is released under the MIT license. See [LICENSE](./LICENSE).

Contributions, bug reports and small improvements are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) and [SECURITY.md](./SECURITY.md).
