import type { TransformToken } from './languageTypes';

const WORD_RE = /\p{L}+/u;
const TOKEN_RE = /\p{L}[\p{L}\p{M}]*|[^\p{L}]+/gu;

export function tokenize(input: string): TransformToken[] {
  const tokens: TransformToken[] = [];

  for (const match of input.matchAll(TOKEN_RE)) {
    const value = match[0];
    const start = match.index ?? 0;

    tokens.push({
      id: `token-${tokens.length}`,
      type: WORD_RE.test(value) ? 'word' : 'separator',
      value,
      output: value,
      start,
      end: start + value.length,
    });
  }

  return tokens;
}

export function normalizeLookupWord(value: string): string {
  return value.toLowerCase().normalize('NFC');
}

export function preserveTitleCase(original: string, replacement: string): string {
  const first = original.match(/^[\p{Lu}\p{Lt}]/u)?.[0];
  if (first) {
    const tail = original.slice(first.length);
    if (tail === tail.toLowerCase()) {
      const [initial = ''] = replacement;
      return initial.toUpperCase() + replacement.slice(initial.length).toLowerCase();
    }
  }

  return replacement;
}
