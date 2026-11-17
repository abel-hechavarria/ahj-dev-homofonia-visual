# Homofonía Visual

App web local para transformar texto mediante homofonía visual en español.

## Uso

```bash
pnpm install
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

Ejemplo:

```text
No sé decirte
No zé desirte
```
