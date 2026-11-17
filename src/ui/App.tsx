import {
  Check,
  Clipboard,
  Download,
  FileText,
  Languages,
  Replace,
  Upload,
} from 'lucide-react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import type { SupportedDialect, SupportedLanguage, TransformMode } from '../lib/languageTypes';
import { availableLanguages, transformText } from '../lib/transform';

const initialText = 'No sé decirte\nCómo fue\nNi explicarme qué pasó';

function readTextFile(file: File) {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsText(file);
  });
}

export function App() {
  const [input, setInput] = useState(initialText);
  const [language, setLanguage] = useState<SupportedLanguage>('es');
  const [dialect, setDialect] = useState<SupportedDialect>('seseo-yeismo');
  const [mode, setMode] = useState<TransformMode>('automatic');
  const [manualSelections, setManualSelections] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedLanguage = availableLanguages.find((item) => item.language === language)!;
  const result = useMemo(
    () =>
      transformText(input, {
        language,
        dialect,
        mode,
        manualSelections,
      }),
    [dialect, input, language, manualSelections, mode],
  );

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await readTextFile(file);
    setInput(text);
    setManualSelections({});
    event.target.value = '';
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const downloadOutput = () => {
    const blob = new Blob([result.output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'homofonia-visual.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateManualSelection = (id: string, value: string) => {
    setManualSelections((current) => ({
      ...current,
      [id]: value,
    }));
  };

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <header className="workspace__header">
          <div>
            <p className="eyebrow">Herramienta local</p>
            <h1 id="app-title">Homofonía Visual</h1>
          </div>
          <div className="metric-strip" aria-label="Resumen">
            <span>
              <strong>{result.stats.replacementCount}</strong>
              cambios
            </span>
            <span>
              <strong>{result.stats.ruleCount}</strong>
              reglas
            </span>
          </div>
        </header>

        <div className="control-bar" aria-label="Controles">
          <label className="field">
            <span>
              <Languages size={16} aria-hidden="true" />
              Idioma
            </span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
            >
              {availableLanguages.map((item) => (
                <option key={item.language} value={item.language}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Dialecto</span>
            <select
              value={dialect}
              onChange={(event) => setDialect(event.target.value as SupportedDialect)}
            >
              {selectedLanguage.dialects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="segmented" aria-label="Modo de transformación">
            <button
              className={mode === 'automatic' ? 'is-active' : ''}
              type="button"
              onClick={() => setMode('automatic')}
            >
              <Replace size={16} aria-hidden="true" />
              Visual
            </button>
            <button
              className={mode === 'manual' ? 'is-active' : ''}
              type="button"
              onClick={() => setMode('manual')}
            >
              <FileText size={16} aria-hidden="true" />
              Manual
            </button>
          </div>
        </div>

        <div className="editor-grid">
          <section className="panel" aria-labelledby="input-title">
            <div className="panel__header">
              <h2 id="input-title">Texto original</h2>
              <button
                aria-label="Abrir selector TXT"
                className="icon-button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={17} aria-hidden="true" />
                <span>TXT</span>
              </button>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".txt,text/plain"
                onChange={handleFile}
                aria-label="Subir TXT"
              />
            </div>
            <textarea
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setManualSelections({});
              }}
              spellCheck="false"
              aria-label="Texto original"
            />
          </section>

          <section className="panel" aria-labelledby="output-title">
            <div className="panel__header">
              <h2 id="output-title">Resultado</h2>
              <div className="button-row">
                <button className="icon-button" type="button" onClick={copyOutput}>
                  {copied ? <Check size={17} aria-hidden="true" /> : <Clipboard size={17} aria-hidden="true" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button
                  aria-label="Descargar TXT"
                  className="icon-button"
                  type="button"
                  onClick={downloadOutput}
                >
                  <Download size={17} aria-hidden="true" />
                  <span>TXT</span>
                </button>
              </div>
            </div>
            <output className="output-box" aria-label="Texto transformado" aria-live="polite">
              {result.tokens.map((token) =>
                token.replacementId ? (
                  <mark key={token.id}>{token.output}</mark>
                ) : (
                  <span key={token.id}>{token.output}</span>
                ),
              )}
            </output>
          </section>
        </div>

        {mode === 'manual' && result.replacements.length > 0 ? (
          <section className="review-panel" aria-labelledby="review-title">
            <div className="panel__header">
              <h2 id="review-title">Revisión</h2>
              <span>{result.replacements.length} opciones</span>
            </div>
            <div className="replacement-list">
              {result.replacements.map((replacement) => (
                <label className="replacement-row" key={replacement.id}>
                  <span className="replacement-row__word">{replacement.original}</span>
                  <select
                    value={manualSelections[replacement.id] ?? replacement.replacement}
                    onChange={(event) =>
                      updateManualSelection(replacement.id, event.target.value)
                    }
                  >
                    <option value="__original__">Sin cambio</option>
                    {replacement.alternatives.map((alternative) => (
                      <option key={alternative} value={alternative}>
                        {alternative}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="data-footnote">
          Reglas fonéticas locales para español seseante/yeísta. Procesamiento local.
        </footer>
      </section>
    </main>
  );
}
