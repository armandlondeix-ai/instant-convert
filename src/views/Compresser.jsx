import React, { useEffect, useMemo, useState } from 'react';
import { FileArchive, FolderOpen, Archive } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { runRustCommand } from '../utils/tauri';
import { usePathDropzone } from '../utils/dropzone';
import BatchFileList from '../components/BatchFileList';
import OutputDirectoryCard from '../components/OutputDirectoryCard';
import {
  removePathFromList,
  toUniquePaths,
} from '../utils/filePaths';
import { renderTemplateForPaths } from '../utils/nameTemplate';

const Compresser = ({ defaultOutputDir = '/home/armand/Test', nameTemplate = '%name%_compresse' }) => {
  const [paths, setPaths] = useState([]);
  const [outputDir, setOutputDir] = useState(defaultOutputDir);
  const [outputName, setOutputName] = useState(nameTemplate);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const progressPercent = batchTotal > 0 ? Math.round((completedCount / batchTotal) * 100) : loading ? 75 : status && !status.startsWith('Erreur') ? 100 : 0;

  const appendFiles = (files) => {
    setPaths((prev) => toUniquePaths(prev, files));
    setStatus('');
  };

  useEffect(() => {
    if (paths.length === 0) {
      setOutputName(nameTemplate);
    }
  }, [paths.length, nameTemplate]);

  const archiveName = useMemo(() => {
    const rendered = renderTemplateForPaths(outputName, paths);
    return `${rendered}.zip`;
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
    setPaths((prev) => removePathFromList(prev, fileToRemove));
  };

  const handleAction = async () => {
    if (paths.length === 0) return;

    const batchPaths = [...paths];
    setLoading(true);
    setStatus('Compression en cours...');
    setCurrentPath('');
    setCompletedCount(0);
    setBatchTotal(batchPaths.length);

    const unlisten = await listen('compression-progress', (event) => {
      const processedPath = event.payload?.path;
      if (!processedPath) return;

      setCurrentPath(processedPath);
      setCompletedCount((prev) => prev + 1);
      setPaths((prev) => prev.filter((path) => path !== processedPath));
    });

    try {
      const result = await runRustCommand('compress_files', { paths: batchPaths, outputDir, outputName });
      setStatus(result);
      setCurrentPath('');
    } catch (err) {
      setStatus('Erreur : ' + err);
      setCurrentPath('');
    } finally {
      unlisten();
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
              <p>Choisissez vos fichiers, vérifiez le contenu du lot et générez une archive ZIP fiable.</p>
            </div>
          </div>
        <div className="info-pill">{paths.length} fichiers sélectionnés</div>
      </div>

      <div className="content-grid">
        <div className="main-column stack-lg">
          <div {...getRootProps()} className={`hero-drop hero-drop-orange ${isDragActive ? 'drag-active' : ''}`} onClick={handlePick}>
            <div className="hero-drop-copy">
              <span className="section-icon accent-orange"><FolderOpen size={24} /></span>
              <h3>Sélection des fichiers et dossiers</h3>
              <p>{isDragActive ? 'Déposez vos fichiers ici.' : 'Ajoutez un ou plusieurs fichiers ou dossiers à placer dans la même archive ZIP.'}</p>
            </div>
          </div>

          <OutputDirectoryCard outputDir={outputDir} onPick={handlePickOutputDir} />

          <div className="panel stack-md">
            <div className="between-row">
              <div>
                <p className="eyebrow">Contenu de l’archive</p>
                <h3 className="panel-title">Fichiers à compresser</h3>
              </div>
              <div className="button-row">
                <button onClick={handlePick} className="btn btn-secondary">
                  Ajouter des fichiers
                </button>
                <button onClick={handlePickFolders} className="btn btn-secondary">
                  Ajouter des dossiers
                </button>
              </div>
            </div>

            <BatchFileList
              files={paths}
              accentClass="accent-orange"
              loading={loading}
              currentPath={currentPath}
              emptyMessage="Aucun fichier sélectionné pour le moment."
              onRemove={removeFile}
            />
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
              <span className="eyebrow light">Résumé</span>
              <span className="progress-value">{completedCount}/{batchTotal || paths.length}</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="progress-text">
              {loading && currentPath
                ? `Traitement : ${currentPath.split('/').pop()}`
                : paths.length === 0 && completedCount === 0
                  ? 'Ajoutez des fichiers pour préparer l’archive.'
                  : loading
                    ? `${completedCount} fichier${completedCount > 1 ? 's' : ''} déjà compressés dans ${archiveName}.`
                    : `${paths.length} fichier${paths.length > 1 ? 's' : ''} seront compressés dans ${archiveName}.`}
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
            {loading ? 'Compression en cours...' : `Générer l’archive ZIP (${paths.length})`}
          </button>
        </aside>
      </div>
    </section>
  );
};

export default Compresser;
