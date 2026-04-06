import React, { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getVersion } from "@tauri-apps/api/app";
import { aboutConfig } from "../config/aboutConfig";
import { defaultSettings, loadSettings } from "../config/settings";
import { getTranslation } from "../config/i18n";
import { supportedFormats } from "../config/supportedFormats";

const acknowledgements = [
  { name: "Tauri", url: "https://tauri.app" },
  { name: "Rust", url: "https://www.rust-lang.org" },
  { name: "React", url: "https://react.dev" },
  { name: "Vite", url: "https://vite.dev" },
  { name: "FFmpeg", url: "https://ffmpeg.org" },
  { name: "lucide-react", url: "https://lucide.dev" },
  { name: "react-dropzone", url: "https://react-dropzone.js.org" },
  { name: "image (Rust)", url: "https://crates.io/crates/image" },
  { name: "printpdf", url: "https://crates.io/crates/printpdf" },
  { name: "lopdf", url: "https://crates.io/crates/lopdf" },
  { name: "zip (Rust)", url: "https://crates.io/crates/zip" },
  { name: "reqwest", url: "https://crates.io/crates/reqwest" },
  { name: "ocrs", url: "https://crates.io/crates/ocrs" },
  { name: "rten", url: "https://crates.io/crates/rten" },
  { name: "ort", url: "https://crates.io/crates/ort" },
];

// Ouvre le lien dans le navigateur système, seulement si une URL est fournie.
const openExternal = async (url) => {
  if (!url) return;

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    console.error("URL externe invalide:", url);
    return;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    console.error("Schéma d’URL refusé:", parsedUrl.protocol);
    return;
  }

  try {
    await openUrl(parsedUrl.toString());
  } catch (err) {
    console.error("Impossible d’ouvrir le lien:", err);
  }
};

const About = () => {
  const [version, setVersion] = useState("");
  const [settings] = useState(() => loadSettings());
  const language = settings.language || defaultSettings.language;
  const t = getTranslation(language);

  useEffect(() => {
    if (typeof window === "undefined" || !window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label) {
      return;
    }

    // La version native n’est disponible que dans le contexte Tauri.
    getVersion()
      .then((v) => setVersion(v))
      .catch(() => setVersion(""));
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyAppearance = () => {
      // On aligne le thème affiché avec le réglage utilisateur ou le système.
      const nextAppearance =
        (settings.appearance || defaultSettings.appearance) === "system"
          ? media.matches
            ? "dark"
            : "light"
          : settings.appearance || defaultSettings.appearance;

      document.documentElement.setAttribute("data-theme", nextAppearance);
    };

    applyAppearance();
    media.addEventListener("change", applyAppearance);
    return () => media.removeEventListener("change", applyAppearance);
  }, [settings.appearance]);

  const { project = {}, links = {} } = aboutConfig;

  const formatGroups = [
    {
      title: t.about.formatsInputs,
      items: [
        { label: t.about.formatsImages, extensions: supportedFormats.images },
        { label: t.about.formatsDocuments, extensions: supportedFormats.documents },
        { label: t.about.formatsAudio, extensions: supportedFormats.audio },
        { label: t.about.formatsVideo, extensions: supportedFormats.video },
      ],
    },
    {
      title: t.about.formatsOutputs,
      items: [
        { label: t.about.formatsImages, extensions: supportedFormats.outputs.images },
        { label: t.about.formatsDocuments, extensions: supportedFormats.outputs.documents },
        { label: t.about.formatsAudio, extensions: supportedFormats.outputs.audio },
        { label: t.about.formatsVideo, extensions: supportedFormats.outputs.video },
      ],
    },
  ];

  const formatList = (items) => items.map((ext) => `.${ext}`).join(", ");

  return (
    <div className="about-shell">
      <header className="about-header">
        <div className="about-header-main">
          <div className="about-badge">IC</div>
          <div className="about-header-copy">
            <h1 className="about-title">{project.name || "Instant Convert"}</h1>
            <p className="about-subtitle">{project.tagline || t.about.aboutBody}</p>
            <div className="about-meta-row">
              {version && <span className="about-meta">{t.about.versionLabel} {version}</span>}
            </div>
          </div>
        </div>

        <div className="about-actions">
          <button
            className="about-button"
            onClick={() => openExternal(links.homepage)}
            disabled={!links.homepage}
            type="button"
          >
            {t.about.homepage}
          </button>
          <button
            className="about-button"
            onClick={() => openExternal(links.repository)}
            disabled={!links.repository}
            type="button"
          >
            {t.about.repository}
          </button>
        </div>
      </header>

      <main className="about-main">
        <div className="about-column">
          <section className="about-card">
            <h2>{t.about.aboutTitle}</h2>
            <p>{t.about.aboutBody}</p>
          </section>

          <section className="about-card">
            <h2>{t.about.formatsTitle}</h2>
            <p className="about-hint">{t.about.formatsHint}</p>

            <div className="about-formats-grid">
              {formatGroups.map((group) => (
                <div key={group.title} className="about-format-block">
                  <h3 className="about-format-title">{group.title}</h3>
                  {group.items.map((item) => (
                    <div key={`${group.title}-${item.label}`}>
                      <p className="about-format-label">{item.label}</p>
                      <p className="about-format-list">{formatList(item.extensions)}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <p className="about-note">{t.about.formatsNote}</p>
          </section>
        </div>

        <div className="about-column">
          <section className="about-card">
            <h2>{t.about.thanksTitle}</h2>
            <p className="about-hint">{t.about.thanksHint}</p>
            <div className="about-links">
              {acknowledgements.map((item) => (
                <button
                  key={item.name}
                  className="about-chip"
                  onClick={() => openExternal(item.url)}
                  type="button"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default About;
