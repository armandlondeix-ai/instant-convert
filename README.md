# Instant Convert

Instant Convert is a local desktop toolbox built with Tauri, React, and Rust.
It is designed for common file workflows without sending your files to a remote service.

## What It Includes

- File conversion for images, documents, audio, and video
- ZIP compression for files and folders
- PDF merging
- Batch image reduction
- OCR text extraction from images
- Local language, appearance, and output naming settings
- An in-app "About" page with project info, supported formats, and links

## Main Screens

- `Convertir` converts batches of compatible files and shows live progress
- `Compresser` builds ZIP archives from files and folders
- `Fusionner PDF` merges multiple PDFs into a single document
- `Réduction` resizes images in batch and can export grayscale versions
- `OCR` extracts text from images using local models
- `Réglages` stores preferences locally on the device
- `À propos` shows project details, acknowledgements, supported formats, and donation links

## Supported Workflows

### Conversion

- Images can be converted to formats such as `pdf`, `png`, `jpg`, `jpeg`, `webp`, `bmp`, `gif`, and `tiff`
- Audio and video conversions are available for compatible inputs and outputs
- Document conversions are available for supported document types
- The exact output formats depend on the input file family and the local tools available on the system

### Compression

- Create ZIP archives from one or many files
- Add folders as inputs
- Monitor progress during batch compression

### PDF Merge

- Merge several PDF files into one output file
- Reorder files before merging

### Image Reduction

- Resize multiple images in one batch
- Choose a scale percentage
- Optionally export grayscale results

### OCR

- Extract text from image files
- OCR models are stored locally in `src-tauri/models`
- Missing models are downloaded automatically on first use

## Settings

The app keeps several preferences locally on the device:

- Language
- Light, dark, or system appearance
- Default output directory
- Output filename templates for conversion, compression, merge, and reduction

## Tech Stack

- Tauri 2
- React 19
- Vite
- Rust
- `ffmpeg` for audio and video processing
- `ocrs` and `rten` for OCR

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

## Project Structure

### Frontend

- `src/views/` contains the tool screens
- `src/components/` contains shared interface pieces
- `src/utils/` contains frontend helpers

### Backend

- `src-tauri/src/lib.rs` is the Tauri entry point
- `src-tauri/src/conversion.rs` handles file conversion commands
- `src-tauri/src/compression.rs` handles ZIP compression
- `src-tauri/src/merge.rs` handles PDF merging
- `src-tauri/src/reduction.rs` handles image reduction
- `src-tauri/src/ocr.rs` handles OCR
- `src-tauri/src/shared.rs` contains shared backend helpers

## Notes

- Everything is designed to run locally on the machine
- OCR model files live in `src-tauri/models`
- Generated directories such as `dist`, `node_modules`, and `src-tauri/target` should not be committed

## Licenses

This project is released under the MIT License. See [LICENSE](./LICENSE).

Third-party dependencies keep their own licenses. Refer to the Rust and npm dependency manifests for the full list of bundled components.

For contributions and project guidelines, see:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)
