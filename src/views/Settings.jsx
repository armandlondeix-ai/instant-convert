import React from 'react';
import { Globe2, Languages, FolderOpen } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { supportedLanguages } from '../i18n';
import { renderTemplateForPaths } from '../utils/nameTemplate';

const Settings = ({ settings, updateSettings, t, resolvedAppearance }) => {
  const appearanceOptions = [
    { value: 'light', label: t.settings.appearanceLight },
    { value: 'dark', label: t.settings.appearanceDark },
    { value: 'system', label: t.settings.appearanceSystem },
  ];

  const currentLanguageLabel = supportedLanguages.find((item) => item.code === settings.language)?.label;
  const currentAppearanceLabel = appearanceOptions.find((item) => item.value === settings.appearance)?.label;
  const previewTemplates = [
    { label: t.settings.namingConversion, value: settings.conversionNameTemplate },
    { label: t.settings.namingCompression, value: settings.compressionNameTemplate },
    { label: t.settings.namingMerge, value: settings.mergeNameTemplate },
    { label: t.settings.namingReduction, value: settings.reductionNameTemplate },
  ];
  const namingFields = [
    {
      id: 'naming-conversion',
      label: t.settings.namingConversion,
      value: settings.conversionNameTemplate,
      onChange: (nextValue) => updateSettings({ conversionNameTemplate: nextValue }),
      placeholder: '%name%_converti',
      suffix: t.settings.namingExampleSuffix,
      preview: renderTemplateForPaths(settings.conversionNameTemplate, ['exemple.png']),
      previewSuffix: t.settings.namingExampleSuffix,
    },
    {
      id: 'naming-compression',
      label: t.settings.namingCompression,
      value: settings.compressionNameTemplate,
      onChange: (nextValue) => updateSettings({ compressionNameTemplate: nextValue }),
      placeholder: '%name%_compresse',
      suffix: '.zip',
      preview: renderTemplateForPaths(settings.compressionNameTemplate, ['exemple.png']),
      previewSuffix: '.zip',
    },
    {
      id: 'naming-merge',
      label: t.settings.namingMerge,
      value: settings.mergeNameTemplate,
      onChange: (nextValue) => updateSettings({ mergeNameTemplate: nextValue }),
      placeholder: 'document_fusionne',
      suffix: '.pdf',
      preview: renderTemplateForPaths(settings.mergeNameTemplate, ['a.pdf', 'b.pdf'], {
        batchName: 'document_fusionne',
        batchExtension: 'pdf',
      }),
      previewSuffix: '.pdf',
    },
    {
      id: 'naming-reduction',
      label: t.settings.namingReduction,
      value: settings.reductionNameTemplate,
      onChange: (nextValue) => updateSettings({ reductionNameTemplate: nextValue }),
      placeholder: '%name%_reduction',
      suffix: t.settings.namingExampleSuffix,
      preview: renderTemplateForPaths(settings.reductionNameTemplate, ['image.jpg']),
      previewSuffix: t.settings.namingExampleSuffix,
    },
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
          <div className="settings-group">
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
          </div>

          <div className="settings-group">
            <div>
              <p className="eyebrow">{t.settings.outputDirLabel}</p>
              <h3 className="panel-title">{t.settings.outputDirHelp}</h3>
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
            </div>
          </div>

          <div className="settings-group">
            <div>
              <p className="eyebrow">{t.settings.namingTitle}</p>
              <h3 className="panel-title">{t.settings.namingSubtitle}</h3>
            </div>

            <div className="naming-grid">
              {namingFields.map((field) => (
                <div key={field.id} className="naming-card">
                  <h4 className="naming-title">{field.label}</h4>
                  <label className="field-label" htmlFor={field.id}>
                    {t.settings.namingLabel}
                  </label>
                  <div className="template-row">
                    <input
                      id={field.id}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="text-input"
                      placeholder={field.placeholder}
                    />
                    <span className="template-suffix">{field.suffix}</span>
                  </div>
                  <p className="field-help">
                    {field.preview}
                    {field.previewSuffix}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-panel">
          <div className="settings-header">
            <Languages size={18} />
            <span>{t.settings.previewTitle}</span>
          </div>

          <div className="settings-preview-hero">
            <p className="settings-preview-kicker">{t.settings.previewTitle}</p>
            <h3>{t.settings.previewText}</h3>
            <p className="settings-preview-note">
              Les changements sont enregistrés localement et appliqués immédiatement.
            </p>
          </div>

          <div className="settings-preview-grid">
            <div className="settings-preview-card">
              <span className="settings-preview-label">{t.settings.languageLabel}</span>
              <strong>{currentLanguageLabel || t.settings.languageLabel}</strong>
            </div>

            <div className="settings-preview-card">
              <span className="settings-preview-label">{t.settings.appearanceLabel}</span>
              <strong>
                {currentAppearanceLabel || t.settings.appearanceLabel}
                {settings.appearance === 'system' ? ` · ${resolvedAppearance}` : ''}
              </strong>
            </div>

            <div className="settings-preview-card settings-preview-card-wide">
              <span className="settings-preview-label">{t.settings.outputDirLabel}</span>
              <strong>{settings.defaultOutputDir}</strong>
            </div>

            <div className="settings-preview-card settings-preview-card-wide">
              <span className="settings-preview-label">{t.settings.namingTitle}</span>
              <div className="settings-preview-chips">
                {previewTemplates.map((item) => (
                  <div key={item.label} className="settings-preview-chip">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Settings;
