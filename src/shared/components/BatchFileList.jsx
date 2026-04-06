import React from 'react';
import { Loader2, X } from 'lucide-react';
import { getFileName } from '../utils/filePaths';

const BatchFileList = ({
  files,
  accentClass,
  loading = false,
  currentPath = '',
  emptyMessage,
  onRemove,
}) => {
  if (files.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="file-list">
      {files.map((path, index) => {
        const isCurrent = loading && currentPath === path;

        return (
          <div key={path} className={`file-row ${isCurrent ? 'conversion-row current' : ''}`}>
            <div className="file-row-main">
              <div className={`file-index ${accentClass}`}>{index + 1}</div>
              <div className="file-copy">
                <span className="file-name">{getFileName(path)}</span>
                <span className="file-subtitle">{path}</span>
              </div>
            </div>
            <div className="file-actions">
              {isCurrent && (
                <span className="file-badge in-progress">
                  <Loader2 size={14} className="spin" />
                  En cours
                </span>
              )}
              {!loading && onRemove && (
                <button onClick={() => onRemove(path)} className="icon-button" aria-label="Supprimer le fichier">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BatchFileList;
