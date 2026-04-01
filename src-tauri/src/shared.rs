use std::collections::BTreeSet;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn cleaned_output_name(name: &str) -> Option<String> {
    sanitize_output_component(name)
}

pub fn build_batch_output_stem(input_path: &Path, output_name: &str, single_file: bool) -> String {
    let input_stem = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("fichier");

    let input_ext = normalized_extension(input_path).unwrap_or_default();
    let date = current_utc_date_yyyy_mm_dd();
    let template = output_name.trim();

    let rendered = render_name_template(template, input_stem, &input_ext, &date);
    let rendered = sanitize_output_component(&rendered).unwrap_or_else(|| input_stem.to_string());
    let rendered = if rendered.trim().is_empty() {
        input_stem.to_string()
    } else {
        rendered
    };

    if single_file {
        rendered
    } else if template.contains("%name%") {
        rendered
    } else {
        // évite les collisions si le template ne varie pas par fichier
        format!("{}_{}", input_stem, rendered)
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
                | "cur"
                | "ani"
                | "pnm"
                | "pbm"
                | "pgm"
                | "ppm"
                | "pam"
                | "pfm"
                | "tga"
                | "hdr"
                | "exr"
                | "jxr"
                | "qoi"
                | "pcx"
                | "dds"
                | "icns"
                | "svgz"
                | "wbmp"
                | "wpg"
                | "rgb"
                | "rgba"
                | "ras"
                | "sgi"
                | "sun"
                | "viff"
                | "vicar"
                | "vda"
                | "uyvy"
                | "yuv"
                | "ycbcr"
                | "xbm"
                | "xpm"
                | "xwd"
                | "xv"
                | "svg"
                | "heic"
                | "heif"
                | "avif"
                | "jxl"
                | "jp2"
                | "j2k"
                | "j2c"
                | "jpc"
                | "jpx"
                | "jpm"
                | "jpf"
                | "ps"
                | "psd"
                | "psb"
                | "ai"
                | "eps"
                | "dng"
                | "cr2"
                | "cr3"
                | "crw"
                | "nef"
                | "arw"
                | "rw2"
                | "orf"
                | "pef"
                | "raf"
                | "srw"
                | "kdc"
                | "dcr"
                | "erf"
                | "3fr"
                | "fff"
                | "mos"
                | "mrw"
                | "mef"
                | "raw"
                | "x3f"
                | "pdf",
        ) => Some("image"),
        Some(
            "docx"
                | "doc"
                | "md"
                | "markdown"
                | "html"
                | "htm"
                | "rtf"
                | "csv"
                | "tsv"
                | "json"
                | "rst"
                | "epub"
                | "odt"
                | "docbook"
                | "dbk"
                | "txt",
        ) => Some("document"),
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
                return Err("Veuillez selectionner uniquement des fichiers du meme type (images, documents, audio ou video).".to_string());
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

pub fn render_name_template(template: &str, name: &str, extension: &str, date: &str) -> String {
    template
        .replace("%name%", name)
        .replace("%extension%", extension)
        .replace("%date%", date)
}

pub fn render_single_output_name_template(
    template: &str,
    name: &str,
    extension: &str,
) -> String {
    let date = current_utc_date_yyyy_mm_dd();
    let rendered = render_name_template(template.trim(), name, extension, &date);
    sanitize_output_component(&rendered).unwrap_or_else(|| name.to_string())
}

pub fn sanitize_output_component(value: &str) -> Option<String> {
    let mut sanitized = String::with_capacity(value.len());

    for ch in value.trim().chars() {
        let mapped = match ch {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\0' => '_',
            ch if ch.is_control() => '_',
            _ => ch,
        };
        sanitized.push(mapped);
    }

    let sanitized = sanitized.trim_matches(|ch: char| ch.is_whitespace() || ch == '.');
    if sanitized.is_empty() || sanitized == "." || sanitized == ".." {
        None
    } else {
        Some(sanitized.to_string())
    }
}

fn current_utc_date_yyyy_mm_dd() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let days = (secs / 86_400) as i64;
    let (year, month, day) = civil_from_days(days);
    format!("{:04}-{:02}-{:02}", year, month, day)
}

// Algorithm by Howard Hinnant (public domain): https://howardhinnant.github.io/date_algorithms.html
fn civil_from_days(z: i64) -> (i32, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097; // [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; // [0, 399]
    let y = (yoe as i32) + (era as i32) * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
    let m = mp + if mp < 10 { 3 } else { -9 }; // [1, 12]
    let year = y + if m <= 2 { 1 } else { 0 };
    (year, m as u32, d as u32)
}

fn is_audio_extension(ext: &str) -> bool {
    matches!(
        ext,
        "mp3"
            | "wav"
            | "flac"
            | "ogg"
            | "mogg"
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
            | "3g2"
            | "ogv"
            | "vob"
            | "rm"
            | "rmb"
            | "rmvb"
            | "ogm"
            | "divx"
            | "swf"
            | "nut"
    )
}

fn available_output_formats_for_extension(ext: &str) -> Vec<&'static str> {
    match ext {
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "tif" | "tiff" | "webp" | "ico" | "cur" | "ani"
        | "pnm" | "pbm" | "pgm" | "ppm" | "pam" | "pfm" | "tga" | "hdr" | "exr" | "jxr" | "qoi"
        | "pcx" | "dds" | "icns" | "svg" | "svgz" | "wbmp" | "wpg" | "rgb" | "rgba" | "ras"
        | "sgi" | "sun" | "viff" | "vicar" | "vda" | "uyvy" | "yuv" | "ycbcr" | "xbm" | "xpm"
        | "xwd" | "xv"
        | "heic" | "heif" | "avif" | "jxl" | "jp2" | "j2k" | "j2c" | "jpc" | "jpx" | "jpm"
        | "jpf" | "ps" | "psd" | "psb" | "ai" | "eps" | "dng" | "cr2" | "cr3" | "crw" | "nef" | "arw"
        | "rw2" | "orf" | "pef" | "raf" | "srw" | "kdc" | "dcr" | "erf" | "3fr" | "fff"
        | "mos" | "mrw" | "mef" | "raw" | "x3f" | "pdf" => {
            vec!["pdf", "png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"]
        }
        "docx" | "doc" | "md" | "markdown" | "html" | "htm" | "rtf" | "csv" | "tsv" | "json"
        | "rst" | "epub" | "odt" | "docbook" | "dbk" | "txt" => vec![
            "pdf", "docx", "odt", "rtf", "html", "md", "rst", "epub", "docbook", "txt",
        ],
        "mp3" | "wav" | "flac" | "ogg" | "opus" | "m4a" | "aac" | "wma" | "aiff"
        | "aif" | "alac" | "amr" | "ac3" | "ape" | "au" | "caf" | "m4b" | "mka"
        | "mp2" | "oga" | "spx" | "weba" | "mogg" => {
            vec!["mp3", "wav", "flac", "ogg", "opus", "m4a", "aac", "wma", "aiff"]
        }
        "mp4" | "mkv" | "mov" | "avi" | "webm" | "flv" | "wmv" | "m4v" | "mpg"
        | "mpeg" | "ts" | "m2ts" | "mts" | "3gp" | "3g2" | "ogv" | "vob" | "rm" | "rmb"
        | "rmvb" | "ogm" | "divx" | "swf" | "nut" => {
            vec!["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v", "mpg", "mpeg", "ts", "3gp", "ogv"]
        }
        _ => Vec::new(),
    }
}
