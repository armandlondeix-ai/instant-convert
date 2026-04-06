import React, { useState } from 'react';
import { ScanText, Copy, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { selectFiles, runRustCommand } from '../shared/utils/tauri';
import { usePathDropzone } from '../shared/hooks/usePathDropzone';

const Ocr = () => {
  const [imagePath, setImagePath] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const progressPercent = loading ? 75 : extractedText ? 100 : 0;

  const applyImage = (files) => {
    if (files.length > 0) {
      setImagePath(files[0]);
      setExtractedText("");
      setError("");
    }
  };

  const handlePickImage = async () => {
    const files = await selectFiles(['png', 'jpg', 'jpeg', 'webp']);
    applyImage(files);
  };

  const { getRootProps, isDragActive } = usePathDropzone({
    onPathsSelected: applyImage,
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    multiple: false,
  });

  const startOcr = async () => {
    setLoading(true);
    setError("");
    try {
      const text = await runRustCommand('run_ocr', { path: imagePath });
      setExtractedText(text);
    } catch (err) {
      setExtractedText("");
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="view-shell">
      <div className="section-heading">
        <div className="section-title">
          <span className="section-icon accent-teal"><ScanText size={22} /></span>
          <div>
            <h2>Extraction de texte</h2>
            <p>Transformez vos images et scans en texte éditable.</p>
          </div>
        </div>
      </div>

      <div className="ocr-grid">
        <div className="stack-lg">
          <div {...getRootProps()} onClick={handlePickImage} className={`hero-drop hero-drop-teal image-picker ${isDragActive ? 'drag-active' : ''}`}>
            {imagePath ? (
              <div className="hero-drop-copy">
                <ImageIcon size={40} />
                <p className="path-text small">{imagePath}</p>
              </div>
            ) : (
              <div className="hero-drop-copy">
                <ImageIcon size={40} />
                <h3>Choisir une image</h3>
                <p>{isDragActive ? 'Déposez votre image ici.' : 'PNG, JPG, JPEG ou WEBP.'}</p>
              </div>
            )}
          </div>

          <button
            disabled={!imagePath || loading}
            onClick={startOcr}
            className="btn btn-teal btn-block"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ScanText size={18} />}
            {loading ? "Analyse en cours..." : "Lancer la reconnaissance"}
          </button>
        </div>

        <div className="panel output-panel">
          <div className="between-row">
            <span className="eyebrow">Texte extrait</span>
            {extractedText && (
              <button onClick={copyToClipboard} className="text-button">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copie" : "Copier"}
              </button>
            )}
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
          <textarea
            value={extractedText}
            readOnly
            placeholder="Le texte apparaîtra ici après l’analyse..."
            className="result-textarea"
          />
          {error && <div className="status-banner error">{error}</div>}
        </div>
      </div>
    </section>
  );
};

export default Ocr;
