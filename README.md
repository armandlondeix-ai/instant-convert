# Instant Convert

Instant Convert is a local desktop toolbox for converting, compressing, merging, reducing, and extracting text from files.
It is built with Tauri, React, and Rust, and it keeps your files on your machine instead of sending them to a remote service.

## What It Does

- Convert images, documents, audio, and video when the format is supported
- Compress files and folders into ZIP archives
- Merge several PDF files into one document
- Reduce the size of multiple images in batch
- Extract text from images with OCR
- Save language, theme, output folder, and naming preferences locally

## How To Use It

The app is organized into seven main screens:

- `Convertir` converts compatible files and shows live progress
- `Compresser` creates ZIP archives from files or folders
- `Fusionner PDF` merges PDF files into one document
- `Réduction` resizes images in batch and can also convert them to grayscale
- `OCR` extracts text from a single image using local OCR models
- `Réglages` stores your preferences on the device
- `À propos` shows project information, supported formats, and useful links

## Quick Start

### Install dependencies

```bash
npm install
```

### Run the frontend only

```bash
npm run dev
```

### Run the desktop app in development

```bash
npm run tauri dev
```

### Build the frontend

```bash
npm run build
```

### Build the desktop application

```bash
npm run tauri build
```

## Requirements

You need:

- Node.js 20 or newer
- Rust toolchain
- The Tauri prerequisites for your operating system
- `ffmpeg` available in your `PATH` for audio and video conversion

If `ffmpeg` is missing, audio and video conversions will fail.

## Project Layout

### Frontend

- `src/views/` contains the screens for each tool
- `src/shared/components/` contains reusable UI components
- `src/shared/hooks/` contains reusable React hooks
- `src/shared/utils/` contains frontend helper functions
- `src/config/` contains translations, settings, formats, and app data

### Backend

- `src-tauri/src/lib.rs` registers the Tauri commands
- `src-tauri/src/conversion.rs` handles file conversion
- `src-tauri/src/compression.rs` handles ZIP compression
- `src-tauri/src/merge.rs` handles PDF merging
- `src-tauri/src/reduction.rs` handles image reduction
- `src-tauri/src/ocr.rs` handles OCR
- `src-tauri/src/shared.rs` contains shared backend helpers

## Supported Workflows

### Conversion

- Images can be converted to formats such as `pdf`, `png`, `jpg`, `jpeg`, `webp`, `bmp`, `gif`, and `tiff`
- Audio and video conversions are available when the input and output formats are supported locally
- Document conversions are available for supported document types
- The exact output formats depend on the file family and the tools installed on the system

### Compression

- Create ZIP archives from one file, many files, or folders
- Monitor progress while the archive is being created

### PDF Merge

- Merge several PDF files into a single output file
- Keep a predictable output name for the generated PDF

### Image Reduction

- Reduce the size of multiple images in one batch
- Choose a scale percentage
- Optionally export grayscale results

### OCR

- Extract text from one image at a time
- OCR models are stored locally in `src-tauri/models`
- If the models are missing, reinstall the app to restore them

## Settings

The app stores these preferences locally on the device:

- Language
- Light, dark, or system appearance
- Default output directory
- Output filename templates for conversion, compression, merge, and reduction

## License

This project is released under the MIT License.
That means you can use, copy, modify, and redistribute the code under the terms described in [LICENSE](./LICENSE).

Third-party dependencies keep their own licenses.
Check `Cargo.toml`, `Cargo.lock`, and `package-lock.json` for the packages included in the project.

## Contributing

If you want to help, please read:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

## Notes

- The app is designed to run locally on your machine
- Generated folders such as `dist`, `node_modules`, and `src-tauri/target` should not be committed
