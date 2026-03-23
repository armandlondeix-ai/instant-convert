use std::fs;
use std::path::{Path, PathBuf};

use image::imageops::FilterType;

use crate::shared::{build_batch_output_stem, cleaned_output_name};

#[tauri::command]
pub fn reduire_image(path: String, scale_percent: u32) -> Result<String, String> {
    let img = image::open(&path).map_err(|e| e.to_string())?;
    let nwidth = (img.width() * scale_percent) / 100;
    let nheight = (img.height() * scale_percent) / 100;

    let scaled = img.resize(nwidth, nheight, FilterType::Lanczos3);

    let path_struct = Path::new(&path);
    let stem = path_struct.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
    let ext = path_struct.extension().and_then(|s| s.to_str()).unwrap_or("jpg");
    let parent = path_struct.parent().unwrap_or(Path::new(""));

    let new_path = parent.join(format!("{}_reduced.{}", stem, ext));
    scaled.save(&new_path).map_err(|e| e.to_string())?;

    Ok(new_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn reduce_images(
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
pub fn process_files(paths: Vec<String>) -> Result<String, String> {
    for path in paths {
        println!("Traitement pour réduction : {}", path);
    }
    Ok("Succès".to_string())
}
