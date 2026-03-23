use std::fs;
use std::path::{Path, PathBuf};

use image::imageops::FilterType;
use ocrs::{ImageSource, OcrEngine, OcrEngineParams};
use rten::Model;

const OCR_DETECTION_MODEL_URL: &str =
    "https://ocrs-models.s3-accelerate.amazonaws.com/text-detection.rten";
const OCR_RECOGNITION_MODEL_URL: &str =
    "https://ocrs-models.s3-accelerate.amazonaws.com/text-recognition.rten";

fn resolve_ocr_model_path(file_name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("models")
        .join(file_name)
}

fn download_file(url: &str, destination: &Path) -> Result<(), String> {
    let response = reqwest::blocking::get(url)
        .map_err(|e| format!("Téléchargement impossible depuis {} : {}", url, e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Téléchargement impossible depuis {} : code HTTP {}",
            url,
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .map_err(|e| format!("Lecture du téléchargement impossible : {}", e))?;

    fs::write(destination, &bytes)
        .map_err(|e| format!("Impossible d'enregistrer {} : {}", destination.display(), e))?;

    Ok(())
}

fn ensure_ocr_models() -> Result<(PathBuf, PathBuf), String> {
    let models_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("models");
    if !models_dir.exists() {
        fs::create_dir_all(&models_dir).map_err(|e| {
            format!(
                "Impossible de créer le dossier de modèles OCR {} : {}",
                models_dir.display(),
                e
            )
        })?;
    }

    let detection_model_path = resolve_ocr_model_path("text-detection.rten");
    let recognition_model_path = resolve_ocr_model_path("text-recognition.rten");

    if !detection_model_path.exists() {
        download_file(OCR_DETECTION_MODEL_URL, &detection_model_path)?;
    }

    if !recognition_model_path.exists() {
        download_file(OCR_RECOGNITION_MODEL_URL, &recognition_model_path)?;
    }

    Ok((detection_model_path, recognition_model_path))
}

fn extract_text_from_dynamic_image(
    engine: &OcrEngine,
    image: &image::DynamicImage,
) -> Result<String, String> {
    let rgb = image.to_rgb8();
    let img_source = ImageSource::from_bytes(rgb.as_raw(), rgb.dimensions())
        .map_err(|e| format!("Préparation de l'image OCR impossible : {}", e))?;
    let ocr_input = engine
        .prepare_input(img_source)
        .map_err(|e| format!("Prétraitement OCR impossible : {}", e))?;

    engine
        .get_text(&ocr_input)
        .map_err(|e| format!("Extraction OCR impossible : {}", e))
}

fn run_ocr_sync(path: String) -> Result<String, String> {
    let image_path = PathBuf::from(&path);
    if !image_path.exists() {
        return Err(format!("Fichier introuvable : {}", image_path.display()));
    }

    let (detection_model_path, recognition_model_path) = ensure_ocr_models()?;

    let detection_model = Model::load_file(&detection_model_path).map_err(|e| {
        format!(
            "Impossible de charger le modele de detection {} : {}",
            detection_model_path.display(),
            e
        )
    })?;
    let recognition_model = Model::load_file(&recognition_model_path).map_err(|e| {
        format!(
            "Impossible de charger le modele de reconnaissance {} : {}",
            recognition_model_path.display(),
            e
        )
    })?;

    let engine = OcrEngine::new(OcrEngineParams {
        detection_model: Some(detection_model),
        recognition_model: Some(recognition_model),
        ..Default::default()
    })
    .map_err(|e| format!("Initialisation OCR impossible : {}", e))?;

    let img = image::open(&image_path)
        .map_err(|e| format!("Impossible d'ouvrir l'image {} : {}", image_path.display(), e))?;

    let candidates = [
        img.clone(),
        image::DynamicImage::ImageLuma8(img.grayscale().to_luma8()),
        {
            let enlarged_width = (img.width() * 2).max(1200);
            let enlarged_height =
                ((img.height() as f32) * (enlarged_width as f32 / img.width() as f32)) as u32;
            img.resize(enlarged_width, enlarged_height.max(1), FilterType::Lanczos3)
        },
    ];

    for candidate in candidates {
        let text = extract_text_from_dynamic_image(&engine, &candidate)?;
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    Err("Aucun texte detecte dans l'image.".to_string())
}

#[tauri::command]
pub async fn run_ocr(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || run_ocr_sync(path))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::run_ocr_sync;
    use image::{ImageBuffer, Rgb};

    #[test]
    fn run_ocr_smoke_test_does_not_crash() {
        let image_path = "/tmp/instant_convert_ocr_smoke.png";
        let image = ImageBuffer::from_pixel(320, 120, Rgb([255u8, 255u8, 255u8]));
        image.save(image_path).unwrap();

        let result = run_ocr_sync(image_path.to_string());
        assert!(
            result.is_ok() || result == Err("Aucun texte detecte dans l'image.".to_string()),
            "unexpected OCR result: {:?}",
            result
        );
    }
}
