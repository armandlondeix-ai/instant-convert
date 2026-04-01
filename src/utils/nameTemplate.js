import { getFileStem, getFileName } from "./filePaths";

export const todayIsoDate = () => {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

export const applyNameTemplate = (template, { name, extension, date } = {}) => {
  const safeTemplate = (template ?? "").toString();
  const safeName = (name ?? "").toString();
  const safeExt = (extension ?? "").toString();
  const safeDate = (date ?? todayIsoDate()).toString();

  return safeTemplate
    .replaceAll("%name%", safeName)
    .replaceAll("%extension%", safeExt)
    .replaceAll("%date%", safeDate);
};

export const renderTemplateForPaths = (template, paths = [], options = {}) => {
  const date = todayIsoDate();
  const first = paths[0];
  const batchName = options.batchName ?? "lot";
  const batchExtension = options.batchExtension ?? "mix";

  const name =
    paths.length === 1
      ? getFileStem(first, "fichier")
      : batchName;

  const extension =
    paths.length === 1
      ? (getFileName(first).split(".").pop() || "").toLowerCase()
      : batchExtension;

  const rendered = applyNameTemplate(template, { name, extension, date }).trim();
  return rendered || name || "fichier";
};

export const renderTemplateForPath = (template, path) =>
  renderTemplateForPaths(template, path ? [path] : []);
