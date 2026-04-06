// Helpers légers pour manipuler les chemins sans dépendre du backend.
export const getFileName = (path) => path.split('/').pop() || 'fichier';

export const getFileStem = (path, fallback = 'fichier') => {
  const fileName = getFileName(path) || fallback;
  return fileName.includes('.') ? fileName.split('.').slice(0, -1).join('.') : fileName;
};

// Les sélections batch doivent éviter les doublons pour limiter les traitements répétés.
export const toUniquePaths = (currentPaths, nextPaths) => [...new Set([...currentPaths, ...nextPaths])];

export const removePathFromList = (paths, pathToRemove) => paths.filter((path) => path !== pathToRemove);
