use std::fs;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::collections::BTreeSet;
use image::imageops::FilterType;
use lopdf::{Document, Object, Dictionary}; 
use ocrs::{ImageSource, OcrEngine, OcrEngineParams};
use rten::Model;
// Modification ici pour la compatibilité zip v7+
use zip::write::SimpleFileOptions; 

mod converters;

const OCR_DETECTION_MODEL_URL: &str = "https://ocrs-models.s3-accelerate.amazonaws.com/text-detection.rten";
const OCR_RECOGNITION_MODEL_URL: &str = "https://ocrs-models.s3-accelerate.amazonaws.com/text-recognition.rten";

fn cleaned_output_name(name: &str) -> Option<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn build_batch_output_stem(input_path: &Path, output_name: &str, single_file: bool) -> String {
    let input_stem = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("fichier");

    if single_file {
        output_name.to_string()
    } else {
        format!("{}_{}", input_stem, output_name)
    }
}

fn add_path_to_zip(
    zip: &mut zip::ZipWriter<File>,
    source_path: &Path,
    archive_path: &Path,
    options: SimpleFileOptions,
) -> Result<(), String> {
    if source_path.is_dir() {
        let dir_name = format!("{}/", archive_path.to_string_lossy().replace('\\', "/"));
        zip.add_directory(&dir_name, options)
            .map_err(|e| e.to_string())?;

        for entry in fs::read_dir(source_path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let child_source_path = entry.path();
            let child_archive_path = archive_path.join(entry.file_name());
            add_path_to_zip(zip, &child_source_path, &child_archive_path, options)?;
        }
    } else if source_path.is_file() {
        let archive_name = archive_path.to_string_lossy().replace('\\', "/");
        let mut file = File::open(source_path).map_err(|e| e.to_string())?;
        zip.start_file(&archive_name, options)
            .map_err(|e| e.to_string())?;

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
        zip.write_all(&buffer).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn normalized_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
}

fn is_audio_extension(ext: &str) -> bool {
    matches!(
        ext,
        "mp3"
            | "wav"
            | "flac"
            | "ogg"
            | "opus"
            | "m4a"
            | "aac"
            | "wma"
            | "aiff"
            | "aif"
            | "alac"
            | "amr"
            | "ac3"
            | "ape"
            | "au"
            | "caf"
            | "m4b"
            | "mka"
            | "mp2"
            | "oga"
            | "spx"
            | "weba"
    )
}

fn is_video_extension(ext: &str) -> bool {
    matches!(
        ext,
        "mp4"
            | "mkv"
            | "mov"
            | "avi"
            | "webm"
            | "flv"
            | "wmv"
            | "m4v"
            | "mpg"
            | "mpeg"
            | "ts"
            | "m2ts"
            | "mts"
            | "3gp"
            | "ogv"
            | "vob"
    )
}

fn path_media_family(path: &Path) -> Option<&'static str> {
    match normalized_extension(path).as_deref() {
        Some(
            "png"
            | "jpg"
            | "jpeg"
            | "gif"
            | "bmp"
            | "tif"
            | "tiff"
            | "webp"
            | "ico"
            | "pnm"
            | "tga"
            | "pdf",
        ) => Some("image"),
        Some(ext) if is_audio_extension(ext) => Some("audio"),
        Some(ext) if is_video_extension(ext) => Some("video"),
        _ => None,
    }
}

fn available_output_formats_for_extension(ext: &str) -> Vec<&'static str> {
    match ext {
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "tif" | "tiff" | "webp" | "ico" | "pnm" | "tga" => {
            vec!["pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"]
        }
        "mp3"
        | "wav"
        | "flac"
        | "ogg"
        | "opus"
        | "m4a"
        | "aac"
        | "wma"
        | "aiff"
        | "aif"
        | "alac"
        | "amr"
        | "ac3"
        | "ape"
        | "au"
        | "caf"
        | "m4b"
        | "mka"
        | "mp2"
        | "oga"
        | "spx"
        | "weba" => vec!["mp3", "wav", "flac", "ogg", "opus", "m4a", "aac", "wma", "aiff"],
        "mp4"
        | "mkv"
        | "mov"
        | "avi"
        | "webm"
        | "flv"
        | "wmv"
        | "m4v"
        | "mpg"
        | "mpeg"
        | "ts"
        | "m2ts"
        | "mts"
        | "3gp"
        | "ogv"
        | "vob" => vec!["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v", "mpg", "mpeg", "ts", "3gp", "ogv"],
        "pdf" => Vec::new(),
        _ => Vec::new(),
    }
}

fn available_output_formats_for_path(path: &Path) -> Vec<&'static str> {
    normalized_extension(path)
        .map(|ext| available_output_formats_for_extension(&ext))
        .unwrap_or_default()
}

fn validate_target_for_paths(paths: &[String], target: &str) -> Result<(), String> {
    let mut family: Option<&'static str> = None;

    for path in paths {
        let input_path = Path::new(path);
        let current_family = path_media_family(input_path).ok_or_else(|| {
            format!("Type de fichier non pris en charge : {}", input_path.display())
        })?;

        if let Some(existing_family) = family {
            if existing_family != current_family {
                return Err("Veuillez selectionner uniquement des fichiers du meme type (images, audio ou video).".to_string());
            }
        } else {
            family = Some(current_family);
        }

        let allowed_formats = available_output_formats_for_path(input_path);
        if !allowed_formats.iter().any(|format| *format == target) {
            let ext = normalized_extension(input_path).unwrap_or_else(|| "inconnu".to_string());
            return Err(format!(
                "Conversion {} -> {} non prise en charge pour {}",
                ext,
                target,
                input_path.display()
            ));
        }
    }

    Ok(())
}

#[tauri::command]
fn get_available_output_formats(paths: Vec<String>) -> Result<Vec<String>, String> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut shared_formats: Option<BTreeSet<String>> = None;

    for path in &paths {
        let input_path = Path::new(path);
        if !input_path.exists() {
            return Err(format!("Fichier introuvable : {}", input_path.display()));
        }

        let current_formats: BTreeSet<String> = available_output_formats_for_path(input_path)
            .into_iter()
            .map(|format| format.to_string())
            .collect();

        shared_formats = Some(match shared_formats {
            Some(existing) => existing
                .intersection(&current_formats)
                .cloned()
                .collect(),
            None => current_formats,
        });
    }

    Ok(shared_formats.unwrap_or_default().into_iter().collect())
}

#[tauri::command]
fn convert_format(paths: Vec<String>, target: String, output_dir: String, output_name: String) -> Result<String, String> {
    let normalized_target = target.to_lowercase();
    validate_target_for_paths(&paths, &normalized_target)?;
    let output_name = cleaned_output_name(&output_name).ok_or("Nom de sortie invalide")?;

    let out_path = PathBuf::from(&output_dir);
    if !out_path.exists() {
        fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
    }

    let single_file = paths.len() == 1;

    for path in paths {
        let input_path = Path::new(&path);
        let output_stem = build_batch_output_stem(input_path, &output_name, single_file);
        let dest_path = out_path.join(format!("{}.{}", output_stem, normalized_target));

        match path_media_family(input_path) {
            Some("image") => {
                if normalized_target == "pdf" {
                    converters::image_to_pdf(input_path, &dest_path)?;
                } else {
                    converters::image_to_image(input_path, &dest_path)?;
                }
            }
            Some("audio") => {
                converters::audio_to_audio(input_path, &dest_path)?;
            }
            Some("video") => {
                converters::video_to_video(input_path, &dest_path)?;
            }
            _ => {
                return Err(format!(
                    "Type de fichier non pris en charge : {}",
                    input_path.display()
                ));
            }
        }
    }
    Ok(format!("Fichiers convertis dans {}", output_dir))
}

#[tauri::command]
fn reduire_image(path: String, scale_percent: u32) -> Result<String, String> {
    let img = image::open(&path).map_err(|e| e.to_string())?;
    let nwidth = (img.width() * scale_percent) / 100;
    let nheight = (img.height() * scale_percent) / 100;

    let scaled = img.resize(nwidth, nheight, FilterType::Lanczos3);
    
    // Génère un nom comme image_reduced.jpg
    let path_struct = Path::new(&path);
    let stem = path_struct.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
    let ext = path_struct.extension().and_then(|s| s.to_str()).unwrap_or("jpg");
    let parent = path_struct.parent().unwrap_or(Path::new(""));
    
    let new_path = parent.join(format!("{}_reduced.{}", stem, ext));
    scaled.save(&new_path).map_err(|e| e.to_string())?;
    
    Ok(new_path.to_string_lossy().into_owned())
}

#[tauri::command]
fn reduce_images(
    paths: Vec<String>,
    scale_percent: u32,
    output_dir: String,
    grayscale: bool,
    output_name: String,
) -> Result<String, String> {
    if paths.is_empty() {
        return Err("Aucun fichier sélectionné".to_string());
    }

    if scale_percent == 0 {
        return Err("Le pourcentage de réduction doit être supérieur à 0".to_string());
    }
    let output_name = cleaned_output_name(&output_name).ok_or("Nom de sortie invalide")?;

    let output_dir = PathBuf::from(&output_dir);
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    }

    let single_file = paths.len() == 1;

    for path in &paths {
        let img = image::open(path).map_err(|e| format!("Erreur sur {}: {}", path, e))?;
        let new_width = ((img.width() * scale_percent) / 100).max(1);
        let new_height = ((img.height() * scale_percent) / 100).max(1);

        let resized = img.resize(new_width, new_height, FilterType::Lanczos3);
        let processed = if grayscale {
            image::DynamicImage::ImageLuma8(resized.grayscale().to_luma8())
        } else {
            resized
        };

        let input_path = Path::new(path);
        let stem = build_batch_output_stem(input_path, &output_name, single_file);
        let ext = input_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("png");

        let output_path = output_dir.join(format!("{}.{}", stem, ext));
        processed
            .save(&output_path)
            .map_err(|e| format!("Impossible d'enregistrer {}: {}", output_path.display(), e))?;
    }

    Ok(format!("Images réduites dans : {}", output_dir.display()))
}

#[tauri::command]
async fn merge_pdfs(paths: Vec<String>, output_dir: String, output_name: String) -> Result<String, String> {
    if paths.is_empty() { return Err("Aucun fichier sélectionné".to_string()); }
    let output_name = cleaned_output_name(&output_name).ok_or("Nom de sortie invalide")?;

    let mut target_doc = Document::with_version("1.5");
    let mut pages_list = Vec::new();
    let mut max_id = 1;

    for path in paths {
        let mut doc = Document::load(&path).map_err(|e| format!("Erreur sur {}: {}", path, e))?;
        doc.renumber_objects_with(max_id);
        let pages = doc.get_pages();
        for (page_id, _) in pages {
            pages_list.push(Object::Reference((page_id, 0)));
        }
        target_doc.objects.extend(doc.objects);
        max_id = target_doc.max_id + 1;
    }

    let mut pages_dict = Dictionary::new();
    pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
    pages_dict.set("Count", Object::Integer(pages_list.len() as i64));
    pages_dict.set("Kids", Object::Array(pages_list));
    let pages_id = target_doc.add_object(pages_dict);

    let mut catalog_dict = Dictionary::new();
    catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
    catalog_dict.set("Pages", Object::Reference(pages_id)); 
    let catalog_id = target_doc.add_object(catalog_dict);
    target_doc.trailer.set("Root", Object::Reference(catalog_id)); 

    let output_dir = PathBuf::from(&output_dir);
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    }
    let output_path = output_dir.join(format!("{}.pdf", output_name));
    target_doc.save(&output_path).map_err(|e| e.to_string())?;

    Ok(format!("PDF fusionné : {}", output_path.display()))
}

#[tauri::command]
async fn compress_files(paths: Vec<String>, output_dir: String, output_name: String) -> Result<String, String> {
    if paths.is_empty() {
        return Err("Aucun fichier sélectionné".to_string());
    }
    let output_name = cleaned_output_name(&output_name).ok_or("Nom de sortie invalide")?;

    let output_dir = PathBuf::from(&output_dir);
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    }

    let zip_path = output_dir.join(format!("{}.zip", output_name)); 

    let file = File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    
    // Correction pour zip v7.4.0 : SimpleFileOptions
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for path_str in paths {
        let path = Path::new(&path_str);
        if !path.exists() {
            return Err(format!("Chemin introuvable : {}", path.display()));
        }

        let archive_root = PathBuf::from(
            path.file_name()
                .and_then(|name| name.to_str())
                .ok_or_else(|| format!("Nom de fichier invalide : {}", path.display()))?,
        );

        add_path_to_zip(&mut zip, path, &archive_root, options)?;
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(format!("Archive créée dans : {}", zip_path.display()))
}

#[tauri::command] 
fn process_files(paths: Vec<String>) -> Result<String, String> {
    for path in paths {
        println!("Traitement pour réduction : {}", path);
    }
    Ok("Succès".to_string())
}

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

#[tauri::command]
fn run_ocr(path: String) -> Result<String, String> {
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
            let enlarged_height = ((img.height() as f32) * (enlarged_width as f32 / img.width() as f32)) as u32;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            process_files, 
            compress_files,
            merge_pdfs,
            reduire_image,
            reduce_images,
            convert_format,
            get_available_output_formats,
            run_ocr
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::run_ocr;
    use image::{ImageBuffer, Rgb};

    #[test]
    fn run_ocr_smoke_test_does_not_crash() {
        let image_path = "/tmp/instant_convert_ocr_smoke.png";
        let image = ImageBuffer::from_pixel(320, 120, Rgb([255u8, 255u8, 255u8]));
        image.save(image_path).unwrap();

        let result = run_ocr(image_path.to_string());
        assert!(
            result.is_ok() || result == Err("Aucun texte detecte dans l'image.".to_string()),
            "unexpected OCR result: {:?}",
            result
        );
    }
}
