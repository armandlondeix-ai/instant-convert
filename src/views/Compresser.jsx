import React, { useMemo, useState } from 'react';
import { FileArchive, FolderOpen, Folder, X, Archive } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { runRustCommand } from '../utils/tauri';
import { usePathDropzone } from '../utils/dropzone';

const Compresser = ({ defaultOutputDir = '/home/armand/Test' }) => {
  const [paths, setPaths] = useState([]);
  const [outputDir, setOutputDir] = useState(defaultOutputDir);
  const [outputName, setOutputName] = useState('archive_compresse');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const progressPercent = loading ? 75 : status && !status.startsWith('Erreur') ? 100 : 0;

  const appendFiles = (files) => {
    setPaths((prev) => [...new Set([...prev, ...files])]);
    if (files.length > 0) {
      const firstFile = files[0].split('/').pop() || 'archive';
      const stem = firstFile.includes('.') ? firstFile.split('.').slice(0, -1).join('.') : firstFile;
      setOutputName(files.length === 1 ? `${stem}_compresse` : 'lot_compresse');
    }
    setStatus('');
  };

  const archiveName = useMemo(() => {
    if (paths.length === 0) return `${outputName}.zip`;
    if (paths.length === 1) {
      const fileName = paths[0].split('/').pop() || 'archive';
      const stem = fileName.includes('.') ? fileName.split('.').slice(0, -1).join('.') : fileName;
      return `${outputName || `${stem || 'archive'}_compresse`}.zip`;
    }
    return `${outputName}.zip`;
  }, [paths, outputName]);

  const handlePick = async () => {
    const selected = await open({ multiple: true });
    if (!selected) return;

    appendFiles(Array.isArray(selected) ? selected : [selected]);
  };

  const handlePickFolders = async () => {
    const selected = await open({ directory: true, multiple: true });
    if (!selected) return;

    appendFiles(Array.isArray(selected) ? selected : [selected]);
  };

  const { getRootProps, isDragActive } = usePathDropzone({
    onPathsSelected: appendFiles,
  });

  const handlePickOutputDir = async () => {
    const selected = await open({
      directory: true,
      defaultPath: outputDir,
    });

    if (selected) setOutputDir(selected);
  };

  const removeFile = (fileToRemove) => {
    setPaths((prev) => prev.filter((path) => path !== fileToRemove));
  };

  const handleAction = async () => {
    if (paths.length === 0) return;

    setLoading(true);
    setStatus('Compression en cours...');
    try {
      const result = await runRustCommand('compress_files', { paths, outputDir, outputName });
      setStatus(result);
    } catch (err) {
      setStatus('Erreur : ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="view-shell view-narrow">
      <div className="section-heading">
        <div className="section-title">
          <span className="section-icon accent-orange"><FileArchive size={22} /></span>
          <div>
            <h2>Compresser</h2>
            <p>Choisissez vos fichiers, verifiez le contenu du lot et generez une archive ZIP fiable.</p>
          </div>
        </div>
        <div className="info-pill">{paths.length} fichiers selectionnes</div>
      </div>

      <div className="content-grid">
        <div className="main-column stack-lg">
          <div {...getRootProps()} className={`hero-drop hero-drop-orange ${isDragActive ? 'drag-active' : ''}`} onClick={handlePick}>
            <div className="hero-drop-copy">
              <span className="section-icon accent-orange"><FolderOpen size={24} /></span>
              <h3>Selection des fichiers et dossiers</h3>
              <p>{isDragActive ? 'Deposez vos fichiers ici.' : 'Ajoutez un ou plusieurs fichiers ou dossiers a placer dans la meme archive ZIP.'}</p>
            </div>
          </div>

          <div className="panel">
            <div className="split-row">
              <div className="icon-copy">
                <div className="section-icon accent-amber">
                  <Folder size={20} />
                </div>
                <div>
                  <p className="eyebrow">Dossier de sortie</p>
                  <p className="path-text">{outputDir}</p>
                </div>
              </div>
              <button onClick={handlePickOutputDir} className="btn btn-secondary">
                Modifier
              </button>
            </div>
          </div>

          <div className="panel stack-md">
            <div className="between-row">
              <div>
                <p className="eyebrow">Contenu de l'archive</p>
                <h3 className="panel-title">Fichiers a compresser</h3>
              </div>
              <div className="button-row">
                <button onClick={handlePick} className="btn btn-secondary">
                  Ajouter fichiers
                </button>
                <button onClick={handlePickFolders} className="btn btn-secondary">
                  Ajouter dossiers
                </button>
              </div>
            </div>

            {paths.length === 0 ? (
              <div className="empty-state">Aucun fichier selectionne pour le moment.</div>
            ) : (
              <div className="file-list">
                {paths.map((path, index) => (
                  <div key={path} className="file-row">
                    <div className="file-row-main">
                      <div className="file-index accent-orange">{index + 1}</div>
                      <div className="file-copy">
                        <span className="file-name">{path.split('/').pop()}</span>
                        <span className="file-subtitle">{path}</span>
                      </div>
                    </div>
                    {!loading && (
                      <button onClick={() => removeFile(path)} className="icon-button" aria-label="Supprimer le fichier">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="settings-panel">
          <div className="settings-header">
            <Archive size={18} />
            <span>Archive ZIP</span>
          </div>

          <div className="progress-card">
            <div className="between-row">
              <span className="eyebrow light">Nom de sortie</span>
            </div>
            <input
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="text-input text-input-dark"
              placeholder="nom_de_sortie"
            />
            <p className="progress-text">{archiveName}</p>
          </div>

          <div className="progress-card">
            <div className="between-row">
              <span className="eyebrow light">Resume</span>
              <span className="progress-value">{paths.length}</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="progress-text">
              {paths.length === 0
                ? "Ajoutez des fichiers pour preparer l'archive."
                : `${paths.length} fichier${paths.length > 1 ? 's' : ''} seront compresses dans ${archiveName}.`}
            </p>
          </div>

          {status && (
            <div className={`status-banner ${status.startsWith('Erreur') ? 'error' : 'info'}`}>
              {status}
            </div>
          )}

          <button
            disabled={loading || paths.length === 0}
            onClick={handleAction}
            className="btn btn-primary btn-block"
          >
            {loading ? 'Compression en cours...' : `Generer l'archive ZIP (${paths.length})`}
          </button>
        </aside>
      </div>
    </section>
  );
};

export default Compresser;
