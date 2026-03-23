# Instant Convert

Instant Convert is a local desktop toolbox built with Tauri, React and Rust.
It focuses on common file workflows without sending files to a remote service.

## What the app does

The current application includes:

- image, audio and video conversion
- ZIP compression for files and folders
- PDF merge
- batch image reduction
- OCR text extraction from images
- language and appearance settings stored locally

The interface keeps long-running tasks alive when switching between tools, and batch screens show live progress as files are processed.

## Current feature set

### Conversion

- Images to `pdf`, `png`, `jpg`, `jpeg`, `webp`, `bmp`, `gif`, `tiff`
- Audio to `mp3`, `wav`, `flac`, `ogg`, `opus`, `m4a`, `aac`, `wma`, `aiff`
- Video to `mp4`, `mkv`, `mov`, `avi`, `webm`, `flv`, `wmv`, `m4v`, `mpg`, `mpeg`, `ts`, `3gp`, `ogv`

### Compression

- ZIP archive generation from one or many files
- Folder compression
- Progress feedback during batch processing

### PDF tools

- Merge several PDF files into one output file

### Image reduction

- Batch resize based on a percentage
- Optional grayscale export

### OCR

- Text extraction from image files
- OCR models stored locally in `src-tauri/models`
- Models downloaded automatically if missing

## Tech stack

- Tauri 2
- React 19
- Vite
- Rust
- `ffmpeg` for audio and video conversion
- `ocrs` + `rten` for OCR

## Requirements

To run the desktop app locally, make sure you have:

- Node.js 20 or newer
- Rust toolchain
- Tauri system prerequisites for your OS
- `ffmpeg` available in your `PATH`

If `ffmpeg` is missing, audio and video conversion will fail.

## Development

Install dependencies:

```bash
npm install
```

Run the frontend only:

```bash
npm run dev
```

Run the desktop app in development:

```bash
npm run tauri dev
```

Build the frontend:

```bash
npm run build
```

Build the desktop application:

```bash
npm run tauri build
```

## Project structure

### Frontend

- `src/views/` contains the tool screens
- `src/components/` contains shared interface pieces
- `src/utils/` contains frontend helpers

### Backend

- `src-tauri/src/lib.rs` is the Tauri entry point
- `src-tauri/src/conversion.rs` handles file conversion commands
- `src-tauri/src/compression.rs` handles ZIP compression
- `src-tauri/src/merge.rs` handles PDF merge
- `src-tauri/src/reduction.rs` handles image reduction
- `src-tauri/src/ocr.rs` handles OCR
- `src-tauri/src/shared.rs` contains shared backend helpers

## Notes

- Everything is designed to run locally on the machine.
- OCR model files live in `src-tauri/models`.
- Generated directories such as `dist`, `node_modules` and `src-tauri/target` should not be committed.

## Open source

This project is released under the MIT license. See [LICENSE](./LICENSE).

For contributions and project guidelines, see:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)
