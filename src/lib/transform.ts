import type { SupportedLanguage, TransformOptions, TransformResult } from './languageTypes';
import { spanishModule } from './languages/spanish';

const modules = {
  es: spanishModule,
};

export function getLanguageModule(language: SupportedLanguage) {
  return modules[language];
}

export function transformText(input: string, options: TransformOptions): TransformResult {
  return getLanguageModule(options.language).transform(input, options);
}

export const availableLanguages = Object.values(modules);
