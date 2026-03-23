import React, { useMemo, useState } from 'react';
import { FileStack, FolderOpen, X, Folder, Files } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { runRustCommand } from '../utils/tauri';
import { usePathDropzone } from '../utils/dropzone';

const FusionPDF = ({ defaultOutputDir = '/home/armand/Test' }) => {
  const [paths, setPaths] = useState([]);
  const [outputDir, setOutputDir] = useState(defaultOutputDir);
  const [outputName, setOutputName] = useState('document_fusionne');
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const progressPercent = loading ? 75 : status && !status.startsWith('Erreur') ? 100 : 0;

  const mergedName = useMemo(() => `${outputName}.pdf`, [outputName]);

  const appendFiles = (files) => {
    setPaths((prev) => [...new Set([...prev, ...files])]);
    if (files.length > 0) {
      const firstFile = files[0].split('/').pop() || 'document';
      const stem = firstFile.includes('.') ? firstFile.split('.').slice(0, -1).join('.') : firstFile;
      setOutputName(`${stem}_fusion`);
    }
    setStatus("");
  };

  const handlePick = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (!selected) return;

    appendFiles(Array.isArray(selected) ? selected : [selected]);
  };

  const { getRootProps, isDragActive } = usePathDropzone({
    onPathsSelected: appendFiles,
    extensions: ['pdf'],
  });

  const handlePickOutputDir = async () => {
    const selected = await open({
      directory: true,
      defaultPath: outputDir,
    });

    if (selected) setOutputDir(selected);
  };

  const handleMerge = async () => {
    if (paths.length < 2) return;

    setLoading(true);
    setStatus("Fusion en cours...");
    try {
      const result = await runRustCommand('merge_pdfs', { paths, outputDir, outputName });
      setStatus(result);
    } catch (err) {
      setStatus("Erreur : " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="view-shell view-narrow">
      <div className="section-heading">
        <div className="section-title">
          <span className="section-icon accent-red"><FileStack size={22} /></span>
          <div>
            <h2>Fusionner des PDF</h2>
            <p>Assemblez plusieurs documents PDF dans un seul fichier final, dans l'ordre choisi.</p>
          </div>
        </div>
        <div className="info-pill">{paths.length} fichiers selectionnes</div>
      </div>

      <div className="content-grid">
        <div className="main-column stack-lg">
          <div {...getRootProps()} className={`hero-drop hero-drop-red ${isDragActive ? 'drag-active' : ''}`} onClick={handlePick}>
            <div className="hero-drop-copy">
              <span className="section-icon accent-red"><FolderOpen size={24} /></span>
              <h3>Ajouter des PDF</h3>
              <p>{isDragActive ? 'Deposez vos PDF ici.' : 'Selectionnez au moins deux documents PDF a assembler dans le meme fichier.'}</p>
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
                <p className="eyebrow">Ordre des documents</p>
                <h3 className="panel-title">PDF a fusionner</h3>
              </div>
              <button onClick={handlePick} className="btn btn-secondary">
                Ajouter
              </button>
            </div>

            {paths.length === 0 ? (
              <div className="empty-state">Aucun PDF selectionne pour le moment.</div>
            ) : (
              <div className="file-list">
                {paths.map((path, i) => (
                  <div key={path} className="file-row">
                    <div className="file-row-main">
                      <div className="file-index accent-red">{i + 1}</div>
                      <div className="file-copy">
                        <span className="file-name">{path.split('/').pop()}</span>
                        <span className="file-subtitle">{path}</span>
                      </div>
                    </div>
                    {!loading && (
                      <button onClick={() => setPaths(paths.filter((item) => item !== path))} className="icon-button" aria-label="Supprimer le fichier">
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
            <Files size={18} />
            <span>Fusion PDF</span>
          </div>

          <div className="progress-card">
            <div className="between-row">
              <span className="eyebrow light">Nom de sortie</span>
            </div>
            <input
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="text-input text-input-dark"
              placeholder="document_fusionne"
            />
            <p className="progress-text">{mergedName}</p>
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
              {paths.length < 2
                ? "Ajoutez au moins deux PDF pour lancer la fusion."
                : `${paths.length} PDF seront fusionnes dans ${mergedName}.`}
            </p>
          </div>

          {status && (
            <div className={`status-banner ${status.startsWith("Erreur") ? 'error' : 'success'}`}>
              {status}
            </div>
          )}

          <button
            disabled={loading || paths.length < 2}
            onClick={handleMerge}
            className="btn btn-primary btn-block"
          >
            {loading ? "Fusion en cours..." : "Fusionner les documents"}
          </button>
        </aside>
      </div>
    </section>
  );
};

export default FusionPDF;
