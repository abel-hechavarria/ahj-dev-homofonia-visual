import type {
  LanguageModule,
  Replacement,
  TransformOptions,
  TransformResult,
  TransformToken,
} from '../languageTypes';
import { normalizeLookupWord, preserveTitleCase, tokenize } from '../text';

const LOWERCASE_LL_MARKER = '\uE003';
const UPPERCASE_LL_MARKER = '\uE004';

const RULE_COUNT = 11;

// Documented lexical families, not a general guess for unfamiliar names.
// https://www.rae.es/dpd/x
const xWithJSound = /^(?:méxico$|mexican|mexiquen|oaxa(?:ca$|queñ)|texas$|texan|ximena$|ximénez$|mexía$|xiotes?$)/;
const xWithSSound = /^(?:x(?:il|en[oó]|er[oó]|ant)|antixen[oó]fob|megaxil[oó]fon|minixerotec|tlaxcal)/;
const xWithVariableSound = /^(?:auxili|(?:in)?exact|xola$|mixiotes?$|xoloitzcuintl)/;

// Preserve aspirated loans and h before diphthongs with possible reinforcement.
// https://www.rae.es/dpd/h
const aspiratedH = /^(?:hámster|haik[uú]|hachís|hándicap|haw[aá]i|hegel|d[ií]rham)/;
const silentH = /(?<!c)h(?!u[aeiáéí]|ie)/gi;

interface VisualTransform {
  value: string;
  ruleIds: string[];
}

function matchCase(source: string, replacement: string): string {
  return source === source.toLowerCase() ? replacement : replacement.toUpperCase();
}

function replaceWithCase(
  value: string,
  pattern: RegExp,
  replacement: string,
  ruleId: string,
  ruleIds: Set<string>,
): string {
  return value.replace(pattern, (match: string) => {
    ruleIds.add(ruleId);
    return matchCase(match, replacement);
  });
}

function rewriteX(value: string, original: string, ruleIds: Set<string>): string {
  if (!/[xX]/.test(value) || xWithVariableSound.test(original)) {
    return value;
  }

  if (xWithJSound.test(original)) {
    return replaceWithCase(value, /x/i, 'j', 'x-j', ruleIds);
  }

  if (xWithSSound.test(original)) {
    return replaceWithCase(value, /x/i, 's', 'x-s', ruleIds);
  }

  // Between vowels or after a vowel at the end of the word.
  return replaceWithCase(value, /(?<=[aeiouáéíóúü])x(?=[aeiouáéíóúü]|$)/gi, 'ks', 'x-ks', ruleIds);
}

function visualTransformWord(word: string): VisualTransform {
  const ruleIds = new Set<string>();
  const source = word.normalize('NFC');
  const normalizedWord = source.toLowerCase();
  // Hold original ll digraphs until the y rule has finished.
  let transformed = source.replace(/ll/gi, (match: string) => {
    ruleIds.add('ll-y');
    return match === 'll' ? LOWERCASE_LL_MARKER : UPPERCASE_LL_MARKER;
  });

  transformed = replaceWithCase(transformed, /qu(?=[eéií])/gi, 'k', 'qu-k', ruleIds);
  transformed = replaceWithCase(transformed, /g(?=[eéií])/gi, 'j', 'ge-gi-j', ruleIds);
  // Leave ch intact and defer soft c so its new s is not swapped again.
  transformed = replaceWithCase(transformed, /c(?![heéií])/gi, 'k', 'hard-c-k', ruleIds);
  transformed = replaceWithCase(transformed, /q/gi, 'k', 'q-k', ruleIds);
  transformed = transformed.replace(/[bv]/gi, (letter: string) => {
    const isB = letter.toLowerCase() === 'b';
    ruleIds.add(isB ? 'b-v' : 'v-b');
    return matchCase(letter, isB ? 'v' : 'b');
  });

  if (!aspiratedH.test(normalizedWord)) {
    transformed = replaceWithCase(transformed, silentH, '', 'silent-h', ruleIds);
  }

  transformed = transformed.replace(/[sz]/gi, (letter: string, offset: number, value: string) => {
    if (offset === value.length - 1) {
      // Final s and z imply different stress in multisyllabic words.
      // Swap only when a single written vowel makes the stress unambiguous.
      const vowels = normalizedWord.match(/[aeiouáéíóúü]/g);
      if (vowels?.length !== 1 || /[áéíóú]/.test(vowels[0])) {
        return letter;
      }
    }

    const isS = letter.toLowerCase() === 's';
    ruleIds.add(isS ? 's-z' : 'z-s');
    return matchCase(letter, isS ? 'z' : 's');
  });
  transformed = replaceWithCase(transformed, /c(?=[eéií])/gi, 's', 'soft-c-s', ruleIds);

  if (transformed === 'y' || transformed === 'Y') {
    ruleIds.add('y-i');
    transformed = matchCase(transformed, 'i');
  } else {
    transformed = replaceWithCase(transformed, /y(?=[aeiouáéíóúü])/gi, 'll', 'y-ll', ruleIds);
  }

  transformed = rewriteX(transformed, normalizedWord, ruleIds);
  transformed = transformed.replaceAll(LOWERCASE_LL_MARKER, 'y').replaceAll(UPPERCASE_LL_MARKER, 'Y');

  return {
    value: transformed === source ? word : preserveTitleCase(source, transformed),
    ruleIds: [...ruleIds],
  };
}

function replacementId(tokenIndex: number, original: string): string {
  return `${tokenIndex}-${normalizeLookupWord(original)}`;
}

function getSelectedReplacement(
  token: TransformToken,
  tokenIndex: number,
  transformed: string,
  options: TransformOptions,
) {
  const id = replacementId(tokenIndex, token.value);
  const selected = options.manualSelections?.[id];

  if (options.mode === 'manual' && selected) {
    return selected === '__original__' ? token.value : selected;
  }

  return transformed;
}

export const spanishModule: LanguageModule = {
  language: 'es',
  label: 'Español',
  dialects: [
    {
      id: 'seseo-yeismo',
      label: 'Seseo + yeísmo',
    },
  ],
  ruleCount: RULE_COUNT,
  findAlternatives(word: string) {
    const transformed = visualTransformWord(word);

    return transformed.value === word ? [] : [transformed.value];
  },
  transform(input: string, options: TransformOptions): TransformResult {
    const tokens = tokenize(input);
    const replacements: Replacement[] = [];

    const nextTokens = tokens.map((token, tokenIndex) => {
      if (token.type !== 'word') {
        return token;
      }

      const transformed = visualTransformWord(token.value);
      if (transformed.value === token.value) {
        return token;
      }

      const id = replacementId(tokenIndex, token.value);
      const replacement = getSelectedReplacement(
        token,
        tokenIndex,
        transformed.value,
        options,
      );

      replacements.push({
        id,
        tokenIndex,
        start: token.start,
        end: token.end,
        original: token.value,
        replacement,
        alternatives: [transformed.value],
        ruleIds: transformed.ruleIds,
      });

      return {
        ...token,
        output: replacement,
        replacementId: id,
      };
    });

    return {
      input,
      output: nextTokens.map((token) => token.output).join(''),
      tokens: nextTokens,
      replacements,
      stats: {
        tokenCount: tokens.filter((token) => token.type === 'word').length,
        replacementCount: replacements.filter(
          (item) => item.original !== item.replacement,
        ).length,
        ruleCount: RULE_COUNT,
      },
    };
  },
};
