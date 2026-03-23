import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { RefreshCcw, FileText, Settings2, Play, CheckCircle } from 'lucide-react';
import { usePathDropzone } from '../utils/dropzone';
import BatchFileList from '../components/BatchFileList';
import OutputDirectoryCard from '../components/OutputDirectoryCard';
import {
  buildSingleOrBatchOutputName,
  buildConvertedOutputPath,
  removePathFromList,
  toUniquePaths,
  getFileName,
} from '../utils/filePaths';

const SUPPORTED_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tif', 'tiff', 'webp', 'ico', 'pdf',
  'mp3', 'wav', 'flac', 'ogg', 'opus', 'm4a', 'aac', 'wma', 'aiff', 'aif',
  'alac', 'amr', 'ac3', 'ape', 'au', 'caf', 'm4b', 'mka', 'mp2', 'oga', 'spx', 'weba',
  'mp4', 'mkv', 'mov', 'avi', 'webm', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', 'ts', 'm2ts', 'mts', '3gp', 'ogv', 'vob',
];

const Convertir = ({ defaultOutputDir = '/home/armand/Test' }) => {
  const [files, setFiles] = useState([]);
  const [availableFormats, setAvailableFormats] = useState([]);
  const [targetFormat, setTargetFormat] = useState('');
  const [outputDir, setOutputDir] = useState(defaultOutputDir);
  const [outputName, setOutputName] = useState('converti');
  const [status, setStatus] = useState('idle');
  const [currentFile, setCurrentFile] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastConvertedPath, setLastConvertedPath] = useState('');

  const appendFiles = (nextFiles) => {
    setFiles((prev) => toUniquePaths(prev, nextFiles));
    setOutputName(buildSingleOrBatchOutputName(nextFiles, {
      singleSuffix: '_converti',
      batchName: 'converti',
      fallback: 'fichier',
    }));
  };

  useEffect(() => {
    const loadFormats = async () => {
      if (status === 'processing') {
        return;
      }

      if (files.length === 0) {
        setAvailableFormats([]);
        setTargetFormat('');
        setErrorMessage('');
        return;
      }

      try {
        const formats = await invoke('get_available_output_formats', { paths: files });
        setAvailableFormats(formats);

        if (formats.length === 0) {
          setTargetFormat('');
          setErrorMessage('Aucun format de sortie commun n’est disponible pour cette selection.');
          return;
        }

        setErrorMessage('');
        setTargetFormat((prev) => (formats.includes(prev) ? prev : formats[0]));
      } catch (err) {
        setAvailableFormats([]);
        setTargetFormat('');
        setErrorMessage(String(err));
      }
    };

    loadFormats();
  }, [files, status]);

  const selectFiles = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Fichiers compatibles', extensions: SUPPORTED_EXTENSIONS }]
    });

    if (!selected) return;

    appendFiles(Array.isArray(selected) ? selected : [selected]);
  };

  const { getRootProps, isDragActive } = usePathDropzone({
    onPathsSelected: appendFiles,
    extensions: SUPPORTED_EXTENSIONS,
  });

  const removeFile = (fileToRemove) => {
    setFiles((prev) => removePathFromList(prev, fileToRemove));
  };

  const selectOutputDir = async () => {
    const selected = await open({
      directory: true,
      defaultPath: outputDir,
    });
    if (selected) setOutputDir(selected);
  };

  const handleRunConversion = async () => {
    if (files.length === 0 || !targetFormat) return;

    const batchFiles = [...files];

    setStatus('processing');
    setCompletedCount(0);
    setBatchTotal(batchFiles.length);
    setCurrentFile(batchFiles[0] || '');
    setErrorMessage('');
    setLastConvertedPath('');

    const singleFile = batchFiles.length === 1;

    const unlisten = await listen('conversion-progress', (event) => {
      const processedFile = event.payload?.path;
      if (!processedFile) return;

      setCompletedCount((prev) => prev + 1);
      setLastConvertedPath(
        buildConvertedOutputPath({
          inputPath: processedFile,
          outputDir,
          outputName,
          targetFormat,
          singleFile,
        }),
      );
      setFiles((prev) => {
        const remainingFiles = prev.filter((queuedFile) => queuedFile !== processedFile);
        setCurrentFile(remainingFiles[0] || '');
        return remainingFiles;
      });
    });

    try {
      await invoke('convert_format', {
        paths: batchFiles,
        target: targetFormat,
        outputDir,
        outputName,
      });

      setStatus('success');
      setCurrentFile('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(String(err));
    } finally {
      unlisten();
    }
  };

  const progressPercent = batchTotal > 0 ? Math.round((completedCount / batchTotal) * 100) : 0;

  const revealConvertedFile = async () => {
    if (!lastConvertedPath) return;

    try {
      await revealItemInDir(lastConvertedPath);
    } catch (err) {
      setErrorMessage(`Impossible d'ouvrir le dossier du fichier converti : ${String(err)}`);
    }
  };

  return (
    <section className="view-shell">
      <div className="section-heading">
        <div className="section-title">
          <span className="section-icon accent-blue"><RefreshCcw size={22} /></span>
          <div>
            <h2>Conversion</h2>
            <p>Ajoutez des images, fichiers audio ou videos, puis choisissez un format de sortie propose automatiquement.</p>
          </div>
        </div>
        <div className="info-pill">{files.length} fichiers en attente</div>
      </div>

      <div className="content-grid">
        <div className="main-column stack-lg">
          <div {...getRootProps()} onClick={selectFiles} className={`hero-drop hero-drop-blue ${isDragActive ? 'drag-active' : ''}`}>
            <div className="hero-drop-copy">
              <span className="section-icon accent-blue"><FileText size={24} /></span>
              <h3>Ajouter des fichiers</h3>
              <p>{isDragActive ? 'Deposez vos fichiers ici.' : "Choisissez vos images, musiques ou videos, puis l'application calcule les formats de sortie possibles."}</p>
            </div>
          </div>

          <OutputDirectoryCard outputDir={outputDir} onPick={selectOutputDir} />

          <div className="panel stack-md">
            <div className="between-row">
              <div>
                <p className="eyebrow">Fichiers du lot</p>
                <h3 className="panel-title">Liste des elements a convertir</h3>
              </div>
              <button onClick={selectFiles} className="btn btn-secondary">
                Ajouter
              </button>
            </div>

            <BatchFileList
              files={files}
              accentClass="accent-blue"
              loading={status === 'processing'}
              currentPath={currentFile}
              emptyMessage="Aucun fichier pour le moment."
              onRemove={removeFile}
            />
          </div>
        </div>

        <aside className="settings-panel">
          <div className="settings-header">
            <Settings2 size={18} />
            <span>Configuration</span>
          </div>

          <div className="stack-md">
            <label className="eyebrow light">Format de sortie</label>
            {availableFormats.length > 0 ? (
              <div className="segmented-control">
                {availableFormats.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    className={`segment ${targetFormat === fmt ? 'active' : ''}`}
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            ) : (
              <p className="settings-hint">
                Ajoutez des images, fichiers audio ou videos compatibles pour voir les formats proposes.
              </p>
            )}
          </div>

          <div className="progress-card">
            <label className="eyebrow light">Nom de sortie</label>
            <input
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              className="text-input text-input-dark"
              placeholder="nom_ou_suffixe"
            />
            <p className="progress-text">
              {files.length <= 1
                ? `Nom final : ${outputName}${targetFormat ? `.${targetFormat}` : ''}`
                : `Chaque fichier sortira avec le suffixe _${outputName}.`}
            </p>
          </div>

          <div className="progress-card">
            <div className="between-row">
              <span className="eyebrow light">Progression</span>
              <span className="progress-value">{completedCount}/{batchTotal || files.length || 0}</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="progress-text">
              {status === 'processing'
                ? `Fichier en cours : ${getFileName(currentFile)}`
                : status === 'success'
                  ? 'Tous les fichiers ont ete convertis.'
                  : targetFormat
                    ? `Sortie selectionnee : ${targetFormat.toUpperCase()}`
                    : 'Selectionnez d abord des fichiers pour voir les sorties possibles.'}
            </p>
          </div>

          {errorMessage && (
            <div className={`status-banner ${status === 'error' ? 'error' : 'info'}`}>{errorMessage}</div>
          )}

          {status === 'success' && lastConvertedPath && (
            <button onClick={revealConvertedFile} className="text-button" type="button">
              Ouvrir dans le gestionnaire de fichiers
            </button>
          )}

          <button
            onClick={handleRunConversion}
            disabled={files.length === 0 || status === 'processing' || !targetFormat}
            className={`btn btn-block ${status === 'success' ? 'btn-success' : 'btn-primary'}`}
          >
            {status === 'success' ? <CheckCircle size={20} /> : <Play size={20} />}
            {status === 'processing' ? 'Conversion en cours...' : status === 'success' ? 'Succes !' : 'Convertir le lot'}
          </button>
        </aside>
      </div>
    </section>
  );
};

export default Convertir;
