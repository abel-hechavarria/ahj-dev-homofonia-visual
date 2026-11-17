# Homofonía Visual

App web local para transformar texto mediante homofonía visual en español.

## Uso

Usa Node.js 22.13+ (rama 22), 24 o 26+, y pnpm 11.7.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

La app abre con Vite y procesa todo en el navegador. No hay backend ni subida de texto a servidor.

## Scripts

- `pnpm dev`: arranca Vite.
- `pnpm test`: ejecuta Vitest.
- `pnpm build`: valida TypeScript y crea `dist/`.

## Motor lingüístico

- Idioma v1: español.
- Dialecto v1: seseo + yeísmo.
- Modo visual: aplica reglas fonéticas a todas las palabras posibles.
- Modo manual: permite mantener la palabra original en cada sustitución.
- Reglas principales: `s→z`, `c(e/i)→s`, `z→s`, `qu→k`, `c(a/o/u)→k`, `b↔v`, `ll↔y`, `h` muda, `x→ks`.
- Se conserva la diéresis en `güe` y `güi`. La alternancia de `s` y `z` al final de palabra se limita a casos con una sola vocal escrita sin tilde, como `voz → bos`. Así se evita cambiar la sílaba tónica en casos como `casas → kazas`.

Ejemplo:

```text
No sé decirte
No zé desirte
```
