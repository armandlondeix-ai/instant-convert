import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import Compresser from './views/Compresser';
import Convertir from './views/Convertir';
import FusionPDF from './views/FusionPDF';
import Ocr from './views/Ocr'; 
import Reduction from './views/Reduction';
import Settings from './views/Settings';
import { getTranslation } from './i18n';
import { defaultSettings, loadSettings, saveSettings } from './settings';


const App = () => {
  const [settings, setSettings] = useState(() => loadSettings());
  const [activeTab, setActiveTab] = useState(() => {
    const loadedSettings = loadSettings();
    if (!loadedSettings.rememberLastTab) return 'convertir';
    return localStorage.getItem('instant-convert-last-tab') || 'convertir';
  });
  const language = settings.language || defaultSettings.language;
  const t = useMemo(() => getTranslation(language), [language]);
  const [resolvedAppearance, setResolvedAppearance] = useState('light');

  const tabLabel = t.tabs[activeTab] || activeTab;

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const handleSetLanguage = (nextLanguage) => {
    updateSettings({ language: nextLanguage });
  };

  const handleSetActiveTab = (nextTab) => {
    setActiveTab(nextTab);
    if (settings.rememberLastTab) {
      localStorage.setItem('instant-convert-last-tab', nextTab);
    }
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyAppearance = () => {
      const nextAppearance =
        settings.appearance === 'system'
          ? (media.matches ? 'dark' : 'light')
          : settings.appearance;

      setResolvedAppearance(nextAppearance);
      document.documentElement.setAttribute('data-theme', nextAppearance);
    };

    applyAppearance();
    media.addEventListener('change', applyAppearance);

    return () => media.removeEventListener('change', applyAppearance);
  }, [settings.appearance]);

  const renderContent = () => {
    switch (activeTab) {
      case 'compresser': return <Compresser defaultOutputDir={settings.defaultOutputDir} />;
      case 'convertir':  return <Convertir defaultOutputDir={settings.defaultOutputDir} />;
      case 'fusionner': return <FusionPDF defaultOutputDir={settings.defaultOutputDir} />;      
      case 'reduction':  return <Reduction defaultOutputDir={settings.defaultOutputDir} />; 
      case 'ocr': return <Ocr />;
      case 'reglages':    return <Settings settings={settings} updateSettings={updateSettings} t={t} resolvedAppearance={resolvedAppearance} />;
      default:           return <Convertir defaultOutputDir={settings.defaultOutputDir} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} t={t} />
      <main className="app-main">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">{t.toolbox}</p>
            <h1>{tabLabel}</h1>
          </div>
          <div className="topbar-chip">{t.offline}</div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
