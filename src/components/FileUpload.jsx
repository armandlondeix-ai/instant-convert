import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';

const FileUpload = ({ onFilesSelected, files, setFiles, accept }) => {
  
  const onDrop = useCallback(acceptedFiles => {
    // On ajoute les nouveaux fichiers à la liste existante
    setFiles(prev => [...prev, ...acceptedFiles]);
    if (onFilesSelected) onFilesSelected(acceptedFiles);
  }, [setFiles, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: accept // ex: {'image/*': ['.png', '.jpg']}
  });

  const removeFile = (name) => {
    setFiles(files.filter(f => f.name !== name));
  };

  return (
    <div className="space-y-4">
      {/* Zone de Drop */}
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-2xl p-10 transition-all duration-200 cursor-pointer
          flex flex-col items-center justify-center gap-4
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
        `}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <Upload size={32} />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">
            {isDragActive ? "Lâchez vos fichiers ici" : "Glissez-déposez vos fichiers"}
          </p>
          <p className="text-sm text-slate-500">ou cliquez pour parcourir votre ordinateur</p>
        </div>
      </div>

      {/* Liste des fichiers sélectionnés */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {files.map((file) => (
            <div key={file.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 text-slate-700">
                <File size={18} className="text-blue-500" />
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button 
                onClick={() => removeFile(file.name)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;