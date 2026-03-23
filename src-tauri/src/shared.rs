use std::collections::BTreeSet;
use std::path::Path;

pub fn cleaned_output_name(name: &str) -> Option<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

pub fn build_batch_output_stem(input_path: &Path, output_name: &str, single_file: bool) -> String {
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

pub fn normalized_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
}

pub fn path_media_family(path: &Path) -> Option<&'static str> {
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

pub fn available_output_formats_for_path(path: &Path) -> Vec<&'static str> {
    normalized_extension(path)
        .map(|ext| available_output_formats_for_extension(&ext))
        .unwrap_or_default()
}

pub fn validate_target_for_paths(paths: &[String], target: &str) -> Result<(), String> {
    let mut family: Option<&'static str> = None;

    for path in paths {
        let input_path = Path::new(path);
        let current_family = path_media_family(input_path).ok_or_else(|| {
            format!("Type de fichier non pris en charge : {}", input_path.display())
        })?;

        if let Some(existing_family) = family {
            if existing_family != current_family {
                return Err(
                    "Veuillez selectionner uniquement des fichiers du meme type (images, audio ou video)."
                        .to_string(),
                );
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

pub fn shared_output_formats(paths: &[String]) -> Result<Vec<String>, String> {
    if paths.is_empty() {
        return Ok(Vec::new());
    }

    let mut shared_formats: Option<BTreeSet<String>> = None;

    for path in paths {
        let input_path = Path::new(path);
        if !input_path.exists() {
            return Err(format!("Fichier introuvable : {}", input_path.display()));
        }

        let current_formats: BTreeSet<String> = available_output_formats_for_path(input_path)
            .into_iter()
            .map(|format| format.to_string())
            .collect();

        shared_formats = Some(match shared_formats {
            Some(existing) => existing.intersection(&current_formats).cloned().collect(),
            None => current_formats,
        });
    }

    Ok(shared_formats.unwrap_or_default().into_iter().collect())
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

fn available_output_formats_for_extension(ext: &str) -> Vec<&'static str> {
    match ext {
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "tif" | "tiff" | "webp" | "ico" | "pnm"
        | "tga" => vec!["pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"],
        "mp3" | "wav" | "flac" | "ogg" | "opus" | "m4a" | "aac" | "wma" | "aiff"
        | "aif" | "alac" | "amr" | "ac3" | "ape" | "au" | "caf" | "m4b" | "mka"
        | "mp2" | "oga" | "spx" | "weba" => {
            vec!["mp3", "wav", "flac", "ogg", "opus", "m4a", "aac", "wma", "aiff"]
        }
        "mp4" | "mkv" | "mov" | "avi" | "webm" | "flv" | "wmv" | "m4v" | "mpg"
        | "mpeg" | "ts" | "m2ts" | "mts" | "3gp" | "ogv" | "vob" => {
            vec!["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v", "mpg", "mpeg", "ts", "3gp", "ogv"]
        }
        "pdf" => Vec::new(),
        _ => Vec::new(),
    }
}
