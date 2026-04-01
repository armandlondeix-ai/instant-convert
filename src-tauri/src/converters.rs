use std::fs::File;
use std::io::BufReader;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::{env, fs};
use std::time::{SystemTime, UNIX_EPOCH};
// Note: ImageTransform est souvent dans 'types' ou accessible via les ops
use printpdf::*; 
use ::image::codecs::gif::GifDecoder;
use ::image::{open, AnimationDecoder, DynamicImage, GenericImageView};

fn dynamic_image_to_raw_image(img: &DynamicImage) -> RawImage {
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    RawImage {
        pixels: RawImageData::U8(rgba.into_raw()),
        width: width as usize,
        height: height as usize,
        data_format: RawImageFormat::RGBA8,
        tag: Vec::new(),
    }
}

fn load_image(input: &Path) -> Result<DynamicImage, String> {
    let extension = input
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_default();

    if extension == "gif" {
        let file = File::open(input).map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);
        let decoder = GifDecoder::new(reader).map_err(|e| e.to_string())?;
        let mut frames = decoder.into_frames();
        let first_frame = frames
            .next()
            .ok_or("GIF vide ou sans image".to_string())?
            .map_err(|e| e.to_string())?;

        return Ok(DynamicImage::ImageRgba8(first_frame.into_buffer()));
    }

    match open(input) {
        Ok(img) => Ok(img),
        Err(_) => {
            // Fallback via ImageMagick to support more formats (svg/psd/heic/raw/pdf…)
            let tmp = create_temp_dir("instant-convert-img")?;
            let png_path = tmp.join("fallback.png");
            imagemagick_convert(input, &png_path)?;
            let img = open(&png_path).map_err(|e| e.to_string())?;
            let _ = fs::remove_dir_all(&tmp);
            Ok(img)
        }
    }
}

pub fn image_to_pdf(input: &Path, output: &Path) -> Result<(), String> {
    let img = match load_image(input) {
        Ok(img) => img,
        Err(_) => {
            // Let ImageMagick generate the PDF directly.
            return imagemagick_convert(input, output);
        }
    };
    let (width, height) = img.dimensions();

    let width_mm = width as f32 * 0.264;
    let height_mm = height as f32 * 0.264;

    let mut doc = PdfDocument::new("Convert");
    let mut page = PdfPage::new(Mm(width_mm), Mm(height_mm), Vec::new());
    
    let raw_image = dynamic_image_to_raw_image(&img);
    
    // Correction E0061: add_image renvoie un ID que nous devons utiliser
    let image_id = doc.add_image(&raw_image);
    
    // Correction E0277 & E0599: Utilisation de l'ID correct
    page.ops.push(Op::UseXobject {
        id: image_id,
        transform: XObjectTransform::default(),
    });

    doc.pages.push(page);

    let mut save_warnings = Vec::new();
    let pdf_bytes = doc.save(&PdfSaveOptions::default(), &mut save_warnings);

    let mut file = File::create(output).map_err(|e| e.to_string())?;
    file.write_all(&pdf_bytes).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub fn image_to_image(input: &Path, output: &Path) -> Result<(), String> {
    let ext = output
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_default();

    // Fast path for common raster formats.
    if matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "gif" | "bmp" | "tif" | "tiff" | "webp" | "ico") {
        if let Ok(img) = load_image(input) {
            match ext.as_str() {
                "jpg" | "jpeg" => img.to_rgb8().save(output).map_err(|e| e.to_string())?,
                "gif" => img.to_rgba8().save(output).map_err(|e| e.to_string())?,
                _ => img.save(output).map_err(|e| e.to_string())?,
            }
            return Ok(());
        }
    }

    // Broad format support via ImageMagick.
    imagemagick_convert(input, output)
}

pub fn audio_to_audio(input: &Path, output: &Path) -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .arg("-y")
        .arg("-i")
        .arg(input)
        .arg(output)
        .status()
        .map_err(|e| format!("Impossible de lancer ffmpeg: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "La conversion audio a echoue pour {} vers {}",
            input.display(),
            output.display()
        ))
    }
}

pub fn video_to_video(input: &Path, output: &Path) -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .arg("-y")
        .arg("-i")
        .arg(input)
        .arg(output)
        .status()
        .map_err(|e| format!("Impossible de lancer ffmpeg: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "La conversion video a echoue pour {} vers {}",
            input.display(),
            output.display()
        ))
    }
}

fn imagemagick_convert(input: &Path, output: &Path) -> Result<(), String> {
    let input_ext = normalized_extension(input).unwrap_or_default();
    let output_ext = normalized_extension(output).unwrap_or_default();

    // For multi-page formats (pdf/ps/eps), default to first page when output is not pdf.
    let input_arg = if matches!(input_ext.as_str(), "pdf" | "ps" | "eps") && output_ext != "pdf" {
        format!("{}[0]", input.display())
    } else {
        input.display().to_string()
    };

    let status = Command::new("magick")
        .arg(input_arg)
        .arg(output)
        .status()
        .map_err(|e| format!("Impossible de lancer ImageMagick (magick): {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "La conversion ImageMagick a echoue pour {} vers {}",
            input.display(),
            output.display()
        ))
    }
}

fn normalized_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
}

fn create_temp_dir(prefix: &str) -> Result<PathBuf, String> {
    let base = env::temp_dir();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let pid = std::process::id();
    let dir = base.join(format!("{}-{}-{}", prefix, pid, now));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn move_or_replace(src: &Path, dest: &Path) -> Result<(), String> {
    if dest.exists() {
        fs::remove_file(dest).map_err(|e| e.to_string())?;
    }
    fs::rename(src, dest).or_else(|_| {
        fs::copy(src, dest).map_err(|e| e.to_string())?;
        fs::remove_file(src).map_err(|e| e.to_string())?;
        Ok(())
    })
}

fn find_first_with_extension(dir: &Path, ext: &str) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && normalized_extension(&path).as_deref() == Some(ext) {
            candidates.push(path);
        }
    }

    candidates
        .into_iter()
        .next()
        .ok_or_else(|| format!("Aucun fichier .{} n’a ete genere par la conversion", ext))
}

fn soffice_convert(input: &Path, outdir: &Path, to_ext: &str) -> Result<PathBuf, String> {
    let status = Command::new("soffice")
        .arg("--headless")
        .arg("--nologo")
        .arg("--nolockcheck")
        .arg("--nodefault")
        .arg("--nofirststartwizard")
        .arg("--convert-to")
        .arg(to_ext)
        .arg("--outdir")
        .arg(outdir)
        .arg(input)
        .status()
        .map_err(|e| format!("Impossible de lancer LibreOffice (soffice): {}", e))?;

    if !status.success() {
        return Err(format!(
            "La conversion LibreOffice a echoue pour {}",
            input.display()
        ));
    }

    find_first_with_extension(outdir, to_ext)
}

fn pandoc_convert(input: &Path, output: &Path) -> Result<(), String> {
    let status = Command::new("pandoc")
        .arg(input)
        .arg("-o")
        .arg(output)
        .status()
        .map_err(|e| format!("Impossible de lancer pandoc: {}", e))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "La conversion pandoc a echoue pour {} vers {}",
            input.display(),
            output.display()
        ))
    }
}

fn escape_html(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn document_to_html_like(input: &Path, output: &Path) -> Result<(), String> {
    let input_ext = normalized_extension(input).unwrap_or_default();

    match input_ext.as_str() {
        "csv" | "tsv" => {
            let raw = fs::read_to_string(input).map_err(|e| e.to_string())?;
            let html = format!(
                "<!doctype html><meta charset=\"utf-8\"><pre>{}</pre>",
                escape_html(&raw)
            );
            fs::write(output, html).map_err(|e| e.to_string())
        }
        "json" => {
            let raw = fs::read_to_string(input).map_err(|e| e.to_string())?;
            let pretty = serde_json::from_str::<serde_json::Value>(&raw)
                .map(|v| serde_json::to_string_pretty(&v).unwrap_or(raw.clone()))
                .unwrap_or(raw);
            let html = format!(
                "<!doctype html><meta charset=\"utf-8\"><pre>{}</pre>",
                escape_html(&pretty)
            );
            fs::write(output, html).map_err(|e| e.to_string())
        }
        "txt" => {
            let raw = fs::read_to_string(input).map_err(|e| e.to_string())?;
            let html = format!(
                "<!doctype html><meta charset=\"utf-8\"><pre>{}</pre>",
                escape_html(&raw)
            );
            fs::write(output, html).map_err(|e| e.to_string())
        }
        _ => pandoc_convert(input, output),
    }
}

fn is_office_like(ext: &str) -> bool {
    matches!(ext, "doc" | "docx" | "odt" | "rtf" | "html" | "htm")
}

pub fn document_to_document(input: &Path, output: &Path) -> Result<(), String> {
    let input_ext = normalized_extension(input).unwrap_or_default();
    let output_ext = normalized_extension(output).unwrap_or_default();

    if output_ext.is_empty() {
        return Err("Format de sortie invalide".to_string());
    }

    if output_ext == "pdf" {
        if is_office_like(&input_ext) {
            let tmp = create_temp_dir("instant-convert-doc")?;
            let produced = soffice_convert(input, &tmp, "pdf")?;
            move_or_replace(&produced, output)?;
            let _ = fs::remove_dir_all(&tmp);
            return Ok(());
        }

        // Génère d’abord un HTML (pandoc ou wrapper simple), puis conversion en PDF via LibreOffice.
        let tmp = create_temp_dir("instant-convert-doc")?;
        let html_path = tmp.join("intermediate.html");
        document_to_html_like(input, &html_path)?;
        let produced = soffice_convert(&html_path, &tmp, "pdf")?;
        move_or_replace(&produced, output)?;
        let _ = fs::remove_dir_all(&tmp);
        return Ok(());
    }

    // Conversions “office-like” via LibreOffice pour meilleure compatibilité (et support de .doc).
    if is_office_like(&input_ext) && matches!(output_ext.as_str(), "docx" | "odt" | "rtf" | "html") {
        let tmp = create_temp_dir("instant-convert-doc")?;
        let produced = soffice_convert(input, &tmp, &output_ext)?;
        move_or_replace(&produced, output)?;
        let _ = fs::remove_dir_all(&tmp);
        return Ok(());
    }

    // Conversions texte brut simples.
    if matches!(input_ext.as_str(), "csv" | "tsv" | "json" | "txt")
        && matches!(output_ext.as_str(), "txt" | "md" | "html")
    {
        let raw = fs::read_to_string(input).map_err(|e| e.to_string())?;
        match output_ext.as_str() {
            "txt" => fs::write(output, raw).map_err(|e| e.to_string())?,
            "md" => {
                let lang = if input_ext == "tsv" { "tsv" } else if input_ext == "csv" { "csv" } else if input_ext == "json" { "json" } else { "" };
                let fenced = if lang.is_empty() {
                    format!("```\n{}\n```", raw)
                } else {
                    format!("```{}\n{}\n```", lang, raw)
                };
                fs::write(output, fenced).map_err(|e| e.to_string())?
            }
            "html" => document_to_html_like(input, output)?,
            _ => {}
        }
        return Ok(());
    }

    // Le reste via pandoc.
    pandoc_convert(input, output)
}
