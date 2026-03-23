import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const normalizePaths = (acceptedFiles) =>
  acceptedFiles
    .map((file) => file.path || file.name)
    .filter(Boolean);

export const usePathDropzone = ({ onPathsSelected, extensions = [], multiple = true }) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      const paths = normalizePaths(acceptedFiles);
      if (paths.length > 0) {
        onPathsSelected(paths);
      }
    },
    [onPathsSelected]
  );

  const accept =
    extensions.length > 0
      ? { 'application/octet-stream': extensions.map((ext) => `.${ext}`) }
      : undefined;

  return useDropzone({
    onDrop,
    multiple,
    noClick: true,
    noKeyboard: true,
    accept,
  });
};
