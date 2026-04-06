import React from 'react';
import { Folder } from 'lucide-react';

const OutputDirectoryCard = ({ outputDir, onPick }) => {
  return (
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
        <button onClick={onPick} className="btn btn-secondary">
          Modifier
        </button>
      </div>
    </div>
  );
};

export default OutputDirectoryCard;
