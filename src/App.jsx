import React, { useEffect, useState } from 'react';
import Sidebar from './shared/components/Sidebar';
import Compresser from './views/Compresser';
import Convertir from './views/Convertir';
import FusionPDF from './views/FusionPDF';
import Ocr from './views/Ocr';
import Reduction from './views/Reduction';
import Settings from './views/Settings';
import About from './views/About';
import { getTranslation } from './config/i18n';
import { defaultSettings, loadSettings, saveSettings } from './config/settings';


const App = () => {
  // Les préférences viennent du stockage local pour garder l'app cohérente au redémarrage.
  const [settings, setSettings] = useState(() => loadSettings());
  // On restaure le dernier onglet utilisé pour réduire les frictions à l'ouverture.
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('instant-convert-last-tab') || 'convertir',
  );
  const language = settings.language || defaultSettings.language;
  const t = getTranslation(language);
  const [resolvedAppearance, setResolvedAppearance] = useState('light');

  const tabLabel = t.tabs[activeTab] || activeTab;

  const updateSettings = (patch) => {
    // Une seule source de vérité: on met à jour l'état puis on persiste immédiatement.
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const handleSetActiveTab = (nextTab) => {
    setActiveTab(nextTab);
    localStorage.setItem('instant-convert-last-tab', nextTab);
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyAppearance = () => {
      // Le thème "system" suit le système, sinon on applique le choix explicite.
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

  // Chaque vue reçoit uniquement les paramètres dont elle a besoin.
  const views = [
    {
      id: 'compresser',
      element: (
        <Compresser
          defaultOutputDir={settings.defaultOutputDir}
          nameTemplate={settings.compressionNameTemplate}
        />
      ),
    },
    {
      id: 'convertir',
      element: (
        <Convertir
          defaultOutputDir={settings.defaultOutputDir}
          nameTemplate={settings.conversionNameTemplate}
        />
      ),
    },
    {
      id: 'fusionner',
      element: (
        <FusionPDF
          defaultOutputDir={settings.defaultOutputDir}
          nameTemplate={settings.mergeNameTemplate}
        />
      ),
    },
    {
      id: 'reduction',
      element: (
        <Reduction
          defaultOutputDir={settings.defaultOutputDir}
          nameTemplate={settings.reductionNameTemplate}
        />
      ),
    },
    { id: 'ocr', element: <Ocr /> },
    {
      id: 'reglages',
      element: (
        <Settings
          settings={settings}
          updateSettings={updateSettings}
          t={t}
          resolvedAppearance={resolvedAppearance}
        />
      ),
    },
    { id: 'apropos', element: <About /> },
  ];

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} t={t} />
      <main className="app-main">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">{t.toolbox}</p>
            <h1>{tabLabel}</h1>
          </div>
        </header>
        {views.map(({ id, element }) => (
          <section
            key={id}
            className={`tab-panel ${activeTab === id ? 'is-active' : ''}`}
            hidden={activeTab !== id}
            aria-hidden={activeTab !== id}
          >
            {element}
          </section>
        ))}
      </main>
    </div>
  );
};

export default App;
