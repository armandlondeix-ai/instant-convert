import React, { useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { FileStack, FolderOpen, Files } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { runRustCommand } from '../utils/tauri';
import { usePathDropzone } from '../utils/dropzone';
import BatchFileList from '../components/BatchFileList';
import OutputDirectoryCard from '../components/OutputDirectoryCard';
import {
  removePathFromList,
  toUniquePaths,
  getFileName,
} from '../utils/filePaths';
import { renderTemplateForPaths } from '../utils/nameTemplate';

const FusionPDF = ({ defaultOutputDir = '/home/armand/Test', nameTemplate = 'document_fusionne' }) => {
  const [paths, setPaths] = useState([]);
  const [outputDir, setOutputDir] = useState(defaultOutputDir);
  const [outputName, setOutputName] = useState(nameTemplate);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const progressPercent = batchTotal > 0 ? Math.round((completedCount / batchTotal) * 100) : loading ? 75 : status && !status.startsWith('Erreur') ? 100 : 0;

  useEffect(() => {
    if (paths.length === 0) {
      setOutputName(nameTemplate);
    }
  }, [paths.length, nameTemplate]);

  const mergedName = useMemo(
    () => `${renderTemplateForPaths(outputName, paths, { batchName: 'document_fusionne', batchExtension: 'pdf' })}.pdf`,
    [outputName, paths],
  );

  const appendFiles = (files) => {
    setPaths((prev) => toUniquePaths(prev, files));
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

    const batchPaths = [...paths];
    setLoading(true);
    setStatus("Fusion en cours...");
    setCurrentPath(batchPaths[0] || '');
    setCompletedCount(0);
    setBatchTotal(batchPaths.length);

    const unlisten = await listen('merge-progress', (event) => {
      const processedPath = event.payload?.path;
      if (!processedPath) return;

      setCompletedCount((prev) => prev + 1);
      setPaths((prev) => {
        const remainingPaths = prev.filter((item) => item !== processedPath);
        setCurrentPath(remainingPaths[0] || '');
        return remainingPaths;
      });
    });

    try {
      const result = await runRustCommand('merge_pdfs', { paths: batchPaths, outputDir, outputName });
      setStatus(result);
      setCurrentPath('');
    } catch (err) {
      setStatus("Erreur : " + err);
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
            <span className="section-icon accent-red"><FileStack size={22} /></span>
            <div>
              <h2>Fusionner des PDF</h2>
              <p>Assemblez plusieurs documents PDF dans un seul fichier final, dans l’ordre choisi.</p>
            </div>
          </div>
        <div className="info-pill">{paths.length} fichiers sélectionnés</div>
      </div>

      <div className="content-grid">
        <div className="main-column stack-lg">
          <div {...getRootProps()} className={`hero-drop hero-drop-red ${isDragActive ? 'drag-active' : ''}`} onClick={handlePick}>
            <div className="hero-drop-copy">
              <span className="section-icon accent-red"><FolderOpen size={24} /></span>
              <h3>Ajouter des PDF</h3>
              <p>{isDragActive ? 'Déposez vos PDF ici.' : 'Sélectionnez au moins deux documents PDF à assembler dans le même fichier.'}</p>
            </div>
          </div>

          <OutputDirectoryCard outputDir={outputDir} onPick={handlePickOutputDir} />

          <div className="panel stack-md">
            <div className="between-row">
              <div>
                <p className="eyebrow">Ordre des documents</p>
                <h3 className="panel-title">PDF à fusionner</h3>
              </div>
              <button onClick={handlePick} className="btn btn-secondary">
                Ajouter
              </button>
            </div>

            <BatchFileList
              files={paths}
              accentClass="accent-red"
              loading={loading}
              currentPath={currentPath}
              emptyMessage="Aucun PDF sélectionné pour le moment."
              onRemove={(path) => setPaths((prev) => removePathFromList(prev, path))}
            />
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
              <span className="eyebrow light">Résumé</span>
              <span className="progress-value">{completedCount}/{batchTotal || paths.length}</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="progress-text">
              {loading && currentPath
                ? `Traitement : ${getFileName(currentPath)}`
                : paths.length < 2 && completedCount === 0
                  ? 'Ajoutez au moins deux PDF pour lancer la fusion.'
                  : loading
                    ? `${completedCount} PDF déjà intégrés dans ${mergedName}.`
                    : `${paths.length} PDF seront fusionnés dans ${mergedName}.`}
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
