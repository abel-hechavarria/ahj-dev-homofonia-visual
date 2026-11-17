import type {
  LanguageModule,
  Replacement,
  TransformOptions,
  TransformResult,
  TransformToken,
} from '../languageTypes';
import { applyOriginalCasing, normalizeLookupWord, tokenize } from '../text';

const SOFT_C_MARKER = '\uE000';
const B_MARKER = '\uE002';
const LL_MARKER = '\uE003';
const CH_MARKER = '\uE004';

const RULE_COUNT = 11;

interface VisualTransform {
  value: string;
  ruleIds: string[];
}

function replaceWhenChanged(
  value: string,
  test: RegExp,
  replace: RegExp,
  replacement: string,
  ruleId: string,
  ruleIds: Set<string>,
) {
  if (!test.test(value)) {
    return value;
  }

  ruleIds.add(ruleId);
  return value.replace(replace, replacement);
}

function visualTransformWord(word: string): VisualTransform {
  const ruleIds = new Set<string>();
  const normalizedWord = normalizeLookupWord(word);
  let transformed = normalizedWord;

  transformed = transformed.replace(/ch/g, CH_MARKER);

  if (/ll/.test(transformed)) {
    ruleIds.add('ll-y');
    transformed = transformed.replace(/ll/g, LL_MARKER);
  }

  transformed = replaceWhenChanged(
    transformed,
    /qu(?=[eéií])/,
    /qu(?=[eéií])/g,
    'k',
    'qu-k',
    ruleIds,
  );

  transformed = replaceWhenChanged(
    transformed,
    /g(?=[eéií])/,
    /g(?=[eéií])/g,
    'j',
    'ge-gi-j',
    ruleIds,
  );

  transformed = replaceWhenChanged(
    transformed,
    /c(?=[eéií])/,
    /c(?=[eéií])/g,
    SOFT_C_MARKER,
    'soft-c-s',
    ruleIds,
  );

  transformed = replaceWhenChanged(
    transformed,
    /c/,
    /c/g,
    'k',
    'hard-c-k',
    ruleIds,
  );

  transformed = replaceWhenChanged(transformed, /q/, /q/g, 'k', 'q-k', ruleIds);

  transformed = replaceWhenChanged(transformed, /b/, /b/g, B_MARKER, 'b-v', ruleIds);
  transformed = replaceWhenChanged(transformed, /v/, /v/g, 'b', 'v-b', ruleIds);
  transformed = transformed.replaceAll(B_MARKER, 'v');

  transformed = replaceWhenChanged(
    transformed,
    /h/,
    /h/g,
    '',
    'silent-h',
    ruleIds,
  );

  transformed = transformed.replace(/[sz]/g, (letter, offset: number, source: string) => {
    if (offset === source.length - 1) {
      // Final s and z imply different stress in multisyllabic words.
      // Swap only when a single written vowel makes the stress unambiguous.
      const vowels = normalizedWord.match(/[aeiouáéíóúü]/g);
      if (vowels?.length !== 1 || /[áéíóú]/.test(vowels[0])) {
        return letter;
      }
    }

    ruleIds.add(letter === 's' ? 's-z' : 'z-s');
    return letter === 's' ? 'z' : 's';
  });
  transformed = transformed.replaceAll(SOFT_C_MARKER, 's');

  if (transformed === 'y') {
    ruleIds.add('y-i');
    transformed = 'i';
  } else if (/y(?=[aeiouáéíóúü])/.test(transformed)) {
    ruleIds.add('y-ll');
    transformed = transformed.replace(/y(?=[aeiouáéíóúü])/g, 'll');
  }

  transformed = replaceWhenChanged(transformed, /x/, /x/g, 'ks', 'x-ks', ruleIds);
  transformed = transformed.replaceAll(LL_MARKER, 'y').replaceAll(CH_MARKER, 'ch');

  return {
    value: transformed === normalizedWord ? word : applyOriginalCasing(word, transformed),
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
