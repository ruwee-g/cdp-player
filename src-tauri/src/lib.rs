use lofty::prelude::*;
use lofty::probe::Probe;
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent};
use walkdir::WalkDir;

const AUDIO_EXTS: &[&str] = &[
    "mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "aiff", "aif", "mp4", "m4v",
];

#[derive(Debug, Serialize, Clone)]
pub struct TrackMeta {
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
    pub has_cover: bool,
}

fn read_one(path: &Path) -> Option<TrackMeta> {
    let path_str = path.to_string_lossy().to_string();
    let file_stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".into());

    let (title, artist, album, duration_secs, has_cover) = match Probe::open(path)
        .ok()
        .and_then(|p| p.read().ok())
    {
        Some(tagged) => {
            let tag = tagged.primary_tag().or_else(|| tagged.first_tag());
            let props = tagged.properties();
            let duration = props.duration().as_secs_f64();
            let has_cover = tag.map(|t| t.picture_count() > 0).unwrap_or(false);
            (
                tag.and_then(|t| t.title().map(|s| s.to_string()))
                    .unwrap_or_else(|| file_stem.clone()),
                tag.and_then(|t| t.artist().map(|s| s.to_string()))
                    .unwrap_or_else(|| "Unknown Artist".into()),
                tag.and_then(|t| t.album().map(|s| s.to_string()))
                    .unwrap_or_else(|| "".into()),
                duration,
                has_cover,
            )
        }
        None => (file_stem, "Unknown Artist".into(), "".into(), 0.0, false),
    };

    Some(TrackMeta {
        path: path_str,
        title,
        artist,
        album,
        duration_secs,
        has_cover,
    })
}

fn is_audio_file(p: &Path) -> bool {
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    AUDIO_EXTS.contains(&ext.as_str())
}

fn push_file(out: &mut Vec<TrackMeta>, p: &Path) {
    if out.len() >= 2000 {
        return;
    }
    if let Some(meta) = read_one(p) {
        out.push(meta);
    }
}

// Accepts a mix of files and folders (file picker multi-select, drag & drop).
// Folders are walked (max depth 4), files are read directly.
#[tauri::command]
fn import_paths(paths: Vec<String>) -> Result<Vec<TrackMeta>, String> {
    let mut out = Vec::new();
    for raw in &paths {
        let p = Path::new(raw);
        if p.is_dir() {
            for entry in WalkDir::new(p)
                .max_depth(4)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let ep = entry.path();
                if !ep.is_file() || !is_audio_file(ep) {
                    continue;
                }
                push_file(&mut out, ep);
                if out.len() >= 2000 {
                    break;
                }
            }
        } else if p.is_file() && is_audio_file(p) {
            push_file(&mut out, p);
        }
        if out.len() >= 2000 {
            break;
        }
    }
    out.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    Ok(out)
}



#[tauri::command]
fn track_cover(path: String) -> Result<Option<String>, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
    let p = Path::new(&path);
    let tagged = Probe::open(p)
        .map_err(|e| e.to_string())?
        .read()
        .map_err(|e| e.to_string())?;
    let pic = tagged
        .primary_tag()
        .or_else(|| tagged.first_tag())
        .and_then(|t| t.pictures().first().cloned());
    match pic {
        Some(picture) => {
            let mime = picture
                .mime_type()
                .map(|m| m.as_str().to_string())
                .unwrap_or_else(|| "image/jpeg".into());
            let b64 = B64.encode(picture.data());
            Ok(Some(format!("data:{mime};base64,{b64}")))
        }
        None => Ok(None),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Second launch (double-clicked file): forward into the live window.
            push_pending_files(app, args_to_files(args));
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .manage(PendingFiles::default())
        .invoke_handler(tauri::generate_handler![
            import_paths,
            track_cover,
            take_pending_files
        ])
        .setup(|app| {
            // First launch may already carry file paths (Open With / CLI).
            push_pending_files(&app.handle(), args_to_files(std::env::args().collect()));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            // macOS Finder "Open With" on the running app.
            if let RunEvent::Opened { urls } = event {
                let paths: Vec<String> = urls
                    .into_iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .map(|p| p.to_string_lossy().into_owned())
                    .collect();
                push_pending_files(app, paths);
            }
        });
}

// ---- Open-with / single-instance plumbing -------------------------------
// Files that arrive while the frontend may not be listening yet accumulate
// here; the frontend drains them once via take_pending_files (pull, no race)
// and subscribes to "open-files" for everything after that.

#[derive(Default)]
struct PendingFiles(Mutex<Vec<String>>);

/// Keep CLI flags and non-files out (tauri dev injects its own args).
fn args_to_files(args: Vec<String>) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|a| !a.starts_with('-') && Path::new(a).is_file())
        .collect()
}

fn push_pending_files(app: &tauri::AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }
    if let Some(state) = app.try_state::<PendingFiles>() {
        state.0.lock().unwrap().extend(paths.clone());
    }
    let _ = app.emit("open-files", paths);
}

/// Drain files collected before the frontend started listening.
#[tauri::command]
fn take_pending_files(state: tauri::State<PendingFiles>) -> Result<Vec<String>, String> {
    let mut lock = state.0.lock().map_err(|e| e.to_string())?;
    Ok(std::mem::take(&mut *lock))
}

