use std::fs;
use std::fs::File;
use std::io::{self, BufReader, BufWriter, Seek, Write};
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::Emitter;
use zip::write::SimpleFileOptions;

use crate::shared::{cleaned_output_name, render_single_output_name_template};

#[derive(Clone, Serialize)]
struct CompressionProgress {
    path: String,
}

fn add_path_to_zip<W>(
    zip: &mut zip::ZipWriter<W>,
    source_path: &Path,
    archive_path: &Path,
    options: SimpleFileOptions,
    skipped_path: Option<&Path>,
) -> Result<(), String>
where
    W: Write + Seek,
{
    let metadata = fs::symlink_metadata(source_path).map_err(|e| e.to_string())?;

    // Les liens symboliques sont ignorés pour éviter de zipper des fichiers en dehors du lot sélectionné.
    if metadata.file_type().is_symlink() {
        return Ok(());
    }

    // On ignore explicitement l'archive de sortie si elle se trouve dans le dossier source.
    if skipped_path.is_some_and(|path| source_path == path) {
        return Ok(());
    }

    if source_path.is_dir() {
        // Les dossiers sont reproduits récursivement pour préserver l'arborescence.
        let dir_name = format!("{}/", archive_path.to_string_lossy().replace('\\', "/"));
        zip.add_directory(&dir_name, options)
            .map_err(|e| e.to_string())?;

        for entry in fs::read_dir(source_path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let child_source_path = entry.path();
            let child_archive_path = archive_path.join(entry.file_name());
            add_path_to_zip(zip, &child_source_path, &child_archive_path, options, skipped_path)?;
        }
    } else if source_path.is_file() {
        let archive_name = archive_path.to_string_lossy().replace('\\', "/");
        let file = File::open(source_path).map_err(|e| e.to_string())?;
        let mut reader = BufReader::new(file);
        zip.start_file(&archive_name, options)
            .map_err(|e| e.to_string())?;
        io::copy(&mut reader, zip).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn compress_files_internal<F>(
    paths: Vec<String>,
    output_dir: String,
    output_name: String,
    mut on_processed: F,
) -> Result<String, String>
where
    F: FnMut(&Path) -> Result<(), String>,
{
    if paths.is_empty() {
        return Err("Aucun fichier sélectionné".to_string());
    }
    let output_name = cleaned_output_name(&output_name).ok_or("Nom de sortie invalide")?;

    let output_dir = PathBuf::from(&output_dir);
    if !output_dir.exists() {
        fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    }

    let mut validated_paths = Vec::new();
    for path_str in paths {
        let path = PathBuf::from(&path_str);
        if !path.exists() {
            return Err(format!("Chemin introuvable : {}", path.display()));
        }
        validated_paths.push(path);
    }

    // Le nom final de l'archive dépend du cas simple ou du lot.
    let name_placeholder = if validated_paths.len() == 1 {
        validated_paths[0]
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("archive")
            .to_string()
    } else {
        "lot".to_string()
    };
    let ext_placeholder = if validated_paths.len() == 1 {
        validated_paths[0]
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase()
    } else {
        "mix".to_string()
    };
    let rendered_output_name =
        render_single_output_name_template(&output_name, &name_placeholder, &ext_placeholder);
    let zip_path = output_dir.join(format!("{}.zip", rendered_output_name));

    let file = File::create(&zip_path).map_err(|e| e.to_string())?;
    let writer = BufWriter::new(file);
    let mut zip = zip::ZipWriter::new(writer);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for path in validated_paths {
        // On utilise le nom racine de chaque élément pour garder une archive lisible.
        let archive_root = PathBuf::from(
            path.file_name()
                .and_then(|name| name.to_str())
                .ok_or_else(|| format!("Nom de fichier invalide : {}", path.display()))?,
        );

        add_path_to_zip(&mut zip, &path, &archive_root, options, Some(&zip_path))?;
        on_processed(&path)?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(format!("Archive créée dans : {}", zip_path.display()))
}

#[tauri::command]
pub async fn compress_files(
    app: tauri::AppHandle,
    paths: Vec<String>,
    output_dir: String,
    output_name: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        compress_files_internal(paths, output_dir, output_name, |path| {
            app.emit(
                "compression-progress",
                CompressionProgress {
                    path: path.to_string_lossy().into_owned(),
                },
            )
            .map_err(|e| e.to_string())
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
fn compress_files_sync(paths: Vec<String>, output_dir: String, output_name: String) -> Result<String, String> {
    compress_files_internal(paths, output_dir, output_name, |_| Ok(()))
}

#[cfg(test)]
mod tests {
    use super::{add_path_to_zip, compress_files_sync};
    use std::fs;
    use std::fs::File;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};
    use zip::write::SimpleFileOptions;

    #[test]
    fn add_path_to_zip_writes_batch_files() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let base_dir = PathBuf::from(format!("/tmp/instant_convert_zip_test_{}", unique));
        let source_dir = base_dir.join("source");
        let zip_path = base_dir.join("archive.zip");

        fs::create_dir_all(&source_dir).unwrap();
        fs::write(source_dir.join("a.txt"), "alpha").unwrap();
        fs::write(source_dir.join("b.txt"), "beta").unwrap();

        let file = File::create(&zip_path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        let options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        add_path_to_zip(&mut zip, &source_dir.join("a.txt"), &PathBuf::from("a.txt"), options, None).unwrap();
        add_path_to_zip(&mut zip, &source_dir.join("b.txt"), &PathBuf::from("b.txt"), options, None).unwrap();
        zip.finish().unwrap();

        let file = File::open(&zip_path).unwrap();
        let mut archive = zip::ZipArchive::new(file).unwrap();
        assert_eq!(archive.len(), 2);
        assert!(archive.by_name("a.txt").is_ok());
        assert!(archive.by_name("b.txt").is_ok());

        fs::remove_dir_all(&base_dir).unwrap();
    }

    #[test]
    fn compress_files_sync_keeps_files_when_output_is_inside_source_dir() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let base_dir = PathBuf::from(format!("/tmp/instant_convert_zip_self_test_{}", unique));
        let source_dir = base_dir.join("source");

        fs::create_dir_all(&source_dir).unwrap();
        fs::write(source_dir.join("a.txt"), "alpha").unwrap();
        fs::write(source_dir.join("b.txt"), "beta").unwrap();

        let result = compress_files_sync(
            vec![source_dir.to_string_lossy().into_owned()],
            source_dir.to_string_lossy().into_owned(),
            "archive".to_string(),
        )
        .unwrap();

        let zip_path = PathBuf::from(result.trim_start_matches("Archive créée dans : "));
        let file = File::open(&zip_path).unwrap();
        let mut archive = zip::ZipArchive::new(file).unwrap();

        assert!(archive.by_name("source/a.txt").is_ok());
        assert!(archive.by_name("source/b.txt").is_ok());
        assert!(archive.by_name("source/archive.zip").is_err());

        fs::remove_dir_all(&base_dir).unwrap();
    }
}
