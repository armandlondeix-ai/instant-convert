use std::path::{Path, PathBuf};
use std::{fs};

use serde::Serialize;
use tauri::Emitter;

use crate::converters;
use crate::shared::{
    build_batch_output_stem, cleaned_output_name, path_media_family, shared_output_formats,
    validate_target_for_paths,
};

#[derive(Clone, Serialize)]
struct ConversionProgress {
    path: String,
}

#[tauri::command]
pub fn get_available_output_formats(paths: Vec<String>) -> Result<Vec<String>, String> {
    shared_output_formats(&paths)
}

#[tauri::command]
pub async fn convert_format(
    app: tauri::AppHandle,
    paths: Vec<String>,
    target: String,
    output_dir: String,
    output_name: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
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

            app.emit(
                "conversion-progress",
                ConversionProgress { path: path.clone() },
            )
            .map_err(|e| e.to_string())?;
        }

        Ok(format!("Fichiers convertis dans {}", output_dir))
    })
    .await
    .map_err(|e| e.to_string())?
}
