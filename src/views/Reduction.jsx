import React, { useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { Minimize2, SlidersHorizontal, Folder, FolderOpen, Image as ImageIcon, X } from 'lucide-react';
import { runRustCommand } from '../utils/tauri';
import { usePathDropzone } from '../utils/dropzone';

const Reduction = ({ defaultOutputDir = '/home/armand/Test' }) => {
  const [paths, setPaths] = useState([]);
  const [outputDir, setOutputDir] = useState(defaultOutputDir);
  const [outputName, setOutputName] = useState('reduit');
  const [scale, setScale] = useState(50);
  const [grayscale, setGrayscale] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const progressPercent = loading ? 75 : status && !status.startsWith('Erreur') ? 100 : 0;

  const summary = useMemo(() => {
    if (paths.length === 0) return "Ajoutez des images pour preparer la reduction.";
    return `${paths.length} image${paths.length > 1 ? 's' : ''} seront reduites a ${scale}%${grayscale ? ' en niveaux de gris' : ''}.`;
  }, [paths, scale, grayscale]);

  const appendFiles = (files) => {
    setPaths((prev) => [...new Set([...prev, ...files])]);
    if (files.length > 0) {
      const firstFile = files[0].split('/').pop() || 'image';
      const stem = firstFile.includes('.') ? firstFile.split('.').slice(0, -1).join('.') : firstFile;
      setOutputName(files.length === 1 ? `${stem}_reduction` : 'reduction');
    }
    setStatus('');
  };

  const handlePick = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'ico'] }],
    });

    if (!selected) return;

    appendFiles(Array.isArray(selected) ? selected : [selected]);
  };

  const { getRootProps, isDragActive } = usePathDropzone({
    onPathsSelected: appendFiles,
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'ico'],
  });

  const handlePickOutputDir = async () => {
    const selected = await open({
      directory: true,
      defaultPath: outputDir,
    });

    if (selected) setOutputDir(selected);
  };

  const handleReduce = async () => {
    if (paths.length === 0) return;

    setLoading(true);
    setStatus('Reduction en cours...');
    try {
      const result = await runRustCommand('reduce_images', {
        paths,
        scalePercent: Number(scale),
        outputDir,
        grayscale,
        outputName,
      });
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
          <span className="section-icon accent-gold"><Minimize2 size={22} /></span>
          <div>
            <h2>Reduire le poids</h2>
            <p>Redimensionnez plusieurs images en une fois avec un dossier de sortie clair.</p>
          </div>
        </div>
        <div className="info-pill">{paths.length} fichiers selectionnes</div>
      </div>

      <div className="content-grid">
        <div className="main-column stack-lg">
          <div {...getRootProps()} className={`hero-drop hero-drop-gold ${isDragActive ? 'drag-active' : ''}`} onClick={handlePick}>
            <div className="hero-drop-copy">
              <span className="section-icon accent-gold"><FolderOpen size={24} /></span>
              <h3>Selection des images</h3>
              <p>{isDragActive ? 'Deposez vos images ici.' : 'Choisissez une ou plusieurs images a redimensionner.'}</p>
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
                <p className="eyebrow">Fichiers a traiter</p>
                <h3 className="panel-title">Images du lot</h3>
              </div>
              <button onClick={handlePick} className="btn btn-secondary">
                Ajouter
              </button>
            </div>

            {paths.length === 0 ? (
              <div className="empty-state">Aucune image selectionnee pour le moment.</div>
            ) : (
              <div className="file-list">
                {paths.map((path, index) => (
                  <div key={path} className="file-row">
                    <div className="file-row-main">
                      <div className="file-index accent-gold">{index + 1}</div>
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
            <ImageIcon size={18} />
            <span>Reduction</span>
          </div>

          <div className="progress-card">
            <label className="eyebrow light">Nom de sortie</label>
            <input
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="text-input text-input-dark"
              placeholder="nom_ou_suffixe"
            />
          </div>

          <div className="progress-card">
            <label className="eyebrow light">Echelle</label>
            <label className="range-label range-label-light">{scale}%</label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              className="slider"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </div>

          <div className="progress-card">
            <label className="option-row option-row-dark">
              <input
                type="checkbox"
                checked={grayscale}
                onChange={(e) => setGrayscale(e.target.checked)}
              />
              <span>Passer en niveaux de gris</span>
            </label>
          </div>

          <div className="progress-card">
            <div className="between-row">
              <span className="eyebrow light">Resume</span>
              <span className="progress-value">{paths.length}</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="progress-text">{summary}</p>
          </div>

          {status && (
            <div className={`status-banner ${status.startsWith('Erreur') ? 'error' : 'info'}`}>
              {status}
            </div>
          )}

          <button
            disabled={loading || paths.length === 0}
            onClick={handleReduce}
            className="btn btn-primary btn-block"
          >
            <SlidersHorizontal size={18} />
            {loading ? 'Reduction en cours...' : 'Appliquer la reduction'}
          </button>
        </aside>
      </div>
    </section>
  );
};

export default Reduction;
