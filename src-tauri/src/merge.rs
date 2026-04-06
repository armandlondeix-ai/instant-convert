use std::fs::File;
use std::fs;
use std::io::BufWriter;
use std::path::PathBuf;

use lopdf::{Dictionary, Document, Object};
use serde::Serialize;
use tauri::Emitter;

use crate::shared::{cleaned_output_name, render_single_output_name_template};

#[derive(Clone, Serialize)]
struct MergeProgress {
    path: String,
}

fn merge_pdfs_internal<F>(
    paths: Vec<String>,
    output_dir: String,
    output_name: String,
    mut on_processed: F,
) -> Result<String, String>
where
    F: FnMut(&str) -> Result<(), String>,
{
    if paths.is_empty() {
        return Err("Aucun fichier sélectionné".to_string());
    }
    let output_name = cleaned_output_name(&output_name).ok_or("Nom de sortie invalide")?;

    let mut target_doc = Document::with_version("1.5");
    let mut pages_list = Vec::new();
    let mut max_id = 1;

    let name_placeholder = if paths.len() == 1 {
        PathBuf::from(&paths[0])
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("document")
            .to_string()
    } else {
        "document_fusionne".to_string()
    };
    let ext_placeholder = "pdf".to_string();
    let rendered_output_name =
        render_single_output_name_template(&output_name, &name_placeholder, &ext_placeholder);

    for path in paths {
        // Chaque PDF est chargé, réindexé et fusionné dans le document cible.
        let mut doc = Document::load(&path).map_err(|e| format!("Erreur sur {}: {}", path, e))?;
        doc.renumber_objects_with(max_id);
        let pages = doc.get_pages();
        for (page_id, _) in pages {
            pages_list.push(Object::Reference((page_id, 0)));
        }
        target_doc.objects.extend(doc.objects);
        max_id = target_doc.max_id + 1;
        on_processed(&path)?;
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
    let output_path = output_dir.join(format!("{}.pdf", rendered_output_name));
    let file = File::create(&output_path).map_err(|e| e.to_string())?;
    let mut writer = BufWriter::new(file);
    target_doc.save_to(&mut writer).map_err(|e| e.to_string())?;

    Ok(format!("PDF fusionné : {}", output_path.display()))
}

#[tauri::command]
pub async fn merge_pdfs(
    app: tauri::AppHandle,
    paths: Vec<String>,
    output_dir: String,
    output_name: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        merge_pdfs_internal(paths, output_dir, output_name, |path| {
            app.emit(
                "merge-progress",
                MergeProgress {
                    path: path.to_string(),
                },
            )
            .map_err(|e| e.to_string())
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
