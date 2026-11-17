export type SupportedLanguage = 'es';
export type SupportedDialect = 'seseo-yeismo';
export type TransformMode = 'automatic' | 'manual';

export interface TransformOptions {
  language: SupportedLanguage;
  dialect: SupportedDialect;
  mode: TransformMode;
  manualSelections?: Record<string, string>;
}

export interface Replacement {
  id: string;
  tokenIndex: number;
  start: number;
  end: number;
  original: string;
  replacement: string;
  alternatives: string[];
  ruleIds: string[];
}

export interface TransformToken {
  id: string;
  type: 'word' | 'separator';
  value: string;
  output: string;
  start: number;
  end: number;
  replacementId?: string;
}

export interface TransformResult {
  input: string;
  output: string;
  tokens: TransformToken[];
  replacements: Replacement[];
  stats: {
    tokenCount: number;
    replacementCount: number;
    ruleCount: number;
  };
}

export interface LanguageModule {
  language: SupportedLanguage;
  label: string;
  dialects: Array<{
    id: SupportedDialect;
    label: string;
  }>;
  transform(input: string, options: TransformOptions): TransformResult;
  findAlternatives(word: string): string[];
  ruleCount: number;
}
