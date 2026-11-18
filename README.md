# Homofonía Visual

Homofonía Visual cambia la escritura de un texto para que se pueda leer de forma parecida. Aplica reglas del español seseante y yeísta. Puedes pegar texto o abrir un archivo TXT, revisar las sustituciones y copiar o descargar el resultado. El texto se procesa en el navegador.

## Primeros pasos

Necesitas Git, pnpm 11.7.0 y Node.js 24, recomendado y probado en CI. También se admiten Node.js 22 a partir de 22.13 y Node.js 26 o posterior.

```bash
git clone https://github.com/abel-hechavarria/ahj-dev-homofonia-visual.git
cd ahj-dev-homofonia-visual
pnpm install --frozen-lockfile
pnpm dev
```

Abre la dirección local que indique Vite. Pega texto en **Texto original** o usa **TXT** para abrir un archivo en UTF-8.

## Modos de transformación

- **Visual** aplica las reglas al escribir y resalta las sustituciones en textos cortos.
- **Manual** ofrece la opción **Sin cambio** para cada sustitución. Las opciones se agrupan en páginas de 50.
- Los resultados largos se muestran completos sin resaltado. **Copiar** y **Descargar TXT** incluyen todo el resultado en ambos modos.

Por ejemplo, `Quiero contar mi historia.` se convierte en `Kiero kontar mi iztoria.`

## Reglas y alcance

Las reglas incluyen `s↔z`, `c(e/i)→s`, `qu→k`, `c(a/o/u)→k`, `b↔v` y `ll↔y`. Entre otras precauciones, el motor conserva la diéresis en `güe` y `güi`, y solo alterna `s` y `z` finales cuando hay una sola vocal escrita sin tilde. Por ejemplo, `voz → bos`, pero `casas → kazas`.

La `x` cambia según el contexto, como en `taxi → taksi`, `xilófono → silófono` y `México → Méjiko`. Se conserva ante consonante y en casos de pronunciación incierta. La `h` se mantiene en préstamos conocidos donde se pronuncia y en grupos como `hue` o `hie`. [RAE/ASALE sobre x](https://www.rae.es/dpd/x) · [RAE/ASALE sobre h](https://www.rae.es/dpd/h)

La transformación es una aproximación basada en reglas. Las variantes regionales, los nombres propios y los préstamos pueden requerir revisión manual.

## Pruebas y compilación

```bash
pnpm test
pnpm build
```

La compilación comprueba TypeScript y genera `dist/`. [GitHub Actions](https://github.com/abel-hechavarria/ahj-dev-homofonia-visual/actions/workflows/ci.yml) comprueba la instalación desde el lockfile, los tests y la compilación en Windows y Ubuntu.

## Reportar un fallo

Abre una [incidencia en GitHub](https://github.com/abel-hechavarria/ahj-dev-homofonia-visual/issues) con un ejemplo breve, el resultado esperado y el obtenido. Si el fallo afecta a la interfaz, incluye el navegador y los pasos para reproducirlo. Usa texto de ejemplo sin datos personales.
