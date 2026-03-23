export const SETTINGS_KEY = 'instant-convert-settings';

export const defaultSettings = {
  language: 'fr',
  appearance: 'system',
  defaultOutputDir: '/home/armand/Test',
};

export const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
