export const getFileName = (path) => path.split('/').pop() || 'fichier';

export const getFileStem = (path, fallback = 'fichier') => {
  const fileName = getFileName(path) || fallback;
  return fileName.includes('.') ? fileName.split('.').slice(0, -1).join('.') : fileName;
};

export const toUniquePaths = (currentPaths, nextPaths) => [...new Set([...currentPaths, ...nextPaths])];

export const removePathFromList = (paths, pathToRemove) => paths.filter((path) => path !== pathToRemove);

export const buildSingleOrBatchOutputName = (
  files,
  { singleSuffix, batchName, fallback = 'fichier' },
) => {
  if (files.length === 0) {
    return batchName;
  }

  if (files.length === 1) {
    return `${getFileStem(files[0], fallback)}${singleSuffix}`;
  }

  return batchName;
};

export const joinPath = (directory, fileName) => {
  const normalizedDirectory = directory.endsWith('/') ? directory.slice(0, -1) : directory;
  return `${normalizedDirectory}/${fileName}`;
};

export const buildConvertedOutputPath = ({
  inputPath,
  outputDir,
  outputName,
  targetFormat,
  singleFile,
}) => {
  const stem = singleFile ? outputName : `${getFileStem(inputPath, 'fichier')}_${outputName}`;
  return joinPath(outputDir, `${stem}.${targetFormat}`);
};
