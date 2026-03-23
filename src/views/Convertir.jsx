import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { RefreshCcw, FileText, Folder, Settings2, Play, CheckCircle, X, Loader2 } from 'lucide-react';
import { usePathDropzone } from '../utils/dropzone';

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

  const appendFiles = (nextFiles) => {
    setFiles((prev) => {
      const merged = [...prev, ...nextFiles];
      return [...new Set(merged)];
    });
    if (nextFiles.length > 0) {
      const firstFile = nextFiles[0].split('/').pop() || 'fichier';
      const stem = firstFile.includes('.') ? firstFile.split('.').slice(0, -1).join('.') : firstFile;
      setOutputName(nextFiles.length === 1 ? `${stem}_converti` : 'converti');
    }
  };

  useEffect(() => {
    const loadFormats = async () => {
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
  }, [files]);

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
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
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
    setCurrentFile('');
    setErrorMessage('');

    try {
      for (let index = 0; index < batchFiles.length; index += 1) {
        const file = batchFiles[index];
        setCurrentFile(file);

        await invoke('convert_format', {
          paths: [file],
          target: targetFormat,
          outputDir,
          outputName,
        });

        setCompletedCount(index + 1);
        setFiles((prev) => prev.filter((queuedFile) => queuedFile !== file));
      }

      setStatus('success');
      setCurrentFile('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(String(err));
    }
  };

  const progressPercent = batchTotal > 0 ? Math.round((completedCount / batchTotal) * 100) : 0;

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
              <button onClick={selectOutputDir} className="btn btn-secondary">
                Modifier
              </button>
            </div>
          </div>

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

            {files.length === 0 ? (
              <div className="empty-state">
                Aucun fichier pour le moment.
              </div>
            ) : (
              <div className="file-list">
                {files.map((file, index) => {
                  const isCurrent = status === 'processing' && currentFile === file;
                  const isDone = completedCount > index;

                  return (
                    <div
                      key={file}
                      className={`file-row conversion-row ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
                    >
                      <div className="file-row-main">
                        <div className={`file-index ${isDone ? 'accent-teal' : 'accent-blue'}`}>
                          {isDone ? <CheckCircle size={16} /> : index + 1}
                        </div>
                        <div className="file-copy">
                          <span className="file-name">{file.split('/').pop()}</span>
                          <span className="file-subtitle">{file}</span>
                        </div>
                      </div>
                      <div className="file-actions">
                        {isCurrent && (
                          <span className="file-badge in-progress">
                            <Loader2 size={14} className="spin" />
                            En cours
                          </span>
                        )}
                        {isDone && !isCurrent && <span className="file-badge success">Converti</span>}
                        {status !== 'processing' && (
                          <button onClick={() => removeFile(file)} className="icon-button" aria-label="Supprimer le fichier">
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                ? `Fichier en cours : ${currentFile.split('/').pop()}`
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
