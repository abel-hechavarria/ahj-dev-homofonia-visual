import { describe, expect, it } from 'vitest';
import { transformText } from '../transform';

const baseOptions = {
  language: 'es' as const,
  dialect: 'seseo-yeismo' as const,
  mode: 'automatic' as const,
};

describe('Spanish visual phonetic transformer', () => {
  it('rewrites every visually transformable word in the sample sentence', () => {
    const result = transformText('Yo quiero comer pan en la esquina de mi casa', baseOptions);

    expect(result.output).toBe('Llo kiero komer pan en la ezkina de mi kaza');
    expect(result.replacements).toHaveLength(5);
  });

  it('preserves capitalization', () => {
    expect(transformText('Cómo', baseOptions).output).toBe('Kómo');
    expect(transformText('HOLA', baseOptions).output).toBe('OLA');
  });

  it('matches the clarified phonetic example', () => {
    expect(transformText('No sé decirte', baseOptions).output).toBe('No zé desirte');
  });

  it('keeps line breaks and punctuation stable', () => {
    const result = transformText('Hola,\ncasa.', baseOptions);

    expect(result.output).toBe('Ola,\nkaza.');
  });

  it('rewrites the uploaded lyric excerpt aggressively', () => {
    const result = transformText(
      'Debes saber\nNo sé decirte\nCómo fue\nNi explicarme qué pasó',
      baseOptions,
    );

    expect(result.output).toBe(
      'Devez zaver\nNo zé desirte\nKómo fue\nNi eksplikarme ké pazó',
    );
  });

  it('honors manual selections', () => {
    const initial = transformText('casa', { ...baseOptions, mode: 'manual' });
    const id = initial.replacements[0].id;
    const result = transformText('casa', {
      ...baseOptions,
      mode: 'manual',
      manualSelections: {
        [id]: '__original__',
      },
    });

    expect(result.output).toBe('casa');
  });
});
