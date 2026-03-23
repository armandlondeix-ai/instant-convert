import React from 'react';
import { Globe2, Languages, FolderOpen } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { supportedLanguages } from '../i18n';

const Settings = ({ settings, updateSettings, t, resolvedAppearance }) => {
  const appearanceOptions = [
    { value: 'light', label: t.settings.appearanceLight },
    { value: 'dark', label: t.settings.appearanceDark },
    { value: 'system', label: t.settings.appearanceSystem },
  ];

  const handlePickOutputDir = async () => {
    const selected = await open({
      directory: true,
      defaultPath: settings.defaultOutputDir,
    });

    if (selected) {
      updateSettings({ defaultOutputDir: selected });
    }
  };

  return (
    <section className="view-shell view-narrow">
      <div className="section-heading">
        <div className="section-title">
          <span className="section-icon accent-teal"><Globe2 size={22} /></span>
          <div>
            <h2>{t.settings.title}</h2>
            <p>{t.settings.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="content-grid two-columns">
        <div className="panel stack-lg">
          <div>
            <p className="eyebrow">{t.settings.section}</p>
            <h3 className="panel-title">{t.settings.languageLabel}</h3>
          </div>

          <div className="language-picker">
            <label className="field-label" htmlFor="language-select">
              {t.settings.languageLabel}
            </label>
            <select
              id="language-select"
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="text-input"
            >
              {supportedLanguages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="field-help">{t.settings.languageHelp}</p>
          </div>

          <div className="language-picker">
            <label className="field-label" htmlFor="appearance-select">
              {t.settings.appearanceLabel}
            </label>
            <select
              id="appearance-select"
              value={settings.appearance}
              onChange={(e) => updateSettings({ appearance: e.target.value })}
              className="text-input"
            >
              {appearanceOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="field-help">{t.settings.appearanceHelp}</p>
          </div>

          <div className="language-picker">
            <label className="field-label" htmlFor="output-dir">
              {t.settings.outputDirLabel}
            </label>
            <div className="input-action-row">
              <input
                id="output-dir"
                value={settings.defaultOutputDir}
                onChange={(e) => updateSettings({ defaultOutputDir: e.target.value })}
                className="text-input"
                placeholder="/home/armand/Test"
              />
              <button onClick={handlePickOutputDir} className="btn btn-secondary" type="button">
                <FolderOpen size={18} />
                Parcourir
              </button>
            </div>
            <p className="field-help">{t.settings.outputDirHelp}</p>
          </div>

        </div>

        <div className="settings-panel">
          <div className="settings-header">
            <Languages size={18} />
            <span>{t.settings.previewTitle}</span>
          </div>

          <div className="progress-card">
            <p className="progress-text">{t.settings.previewText}</p>
          </div>

          <div className="progress-card">
            <div className="between-row">
              <span className="eyebrow light">{t.settings.languageLabel}</span>
            </div>
            <p className="progress-text">
              {supportedLanguages.find((item) => item.code === settings.language)?.label}
            </p>
          </div>

          <div className="progress-card">
            <div className="between-row">
              <span className="eyebrow light">{t.settings.appearanceLabel}</span>
            </div>
            <p className="progress-text">
              {appearanceOptions.find((item) => item.value === settings.appearance)?.label}
              {settings.appearance === 'system' ? ` · ${resolvedAppearance}` : ''}
            </p>
          </div>

          <div className="progress-card">
            <div className="between-row">
              <span className="eyebrow light">{t.settings.outputDirLabel}</span>
            </div>
            <p className="progress-text">{settings.defaultOutputDir}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Settings;
