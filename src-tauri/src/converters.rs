use std::fs::File;
use std::io::BufReader;
use std::io::Write;
use std::path::Path;
use std::process::Command;
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

    open(input).map_err(|e| e.to_string())
}

pub fn image_to_pdf(input: &Path, output: &Path) -> Result<(), String> {
    let img = load_image(input)?;
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
    let img = load_image(input)?;
    let ext = output
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "jpg" | "jpeg" => img.to_rgb8().save(output).map_err(|e| e.to_string())?,
        "gif" => img.to_rgba8().save(output).map_err(|e| e.to_string())?,
        _ => img.save(output).map_err(|e| e.to_string())?,
    }
    Ok(())
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
