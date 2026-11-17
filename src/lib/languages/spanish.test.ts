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

  it.each([
    ['pingüino', 'pingüino'],
    ['vergüenza', 'bergüensa'],
    ['PINGÜINO', 'PINGÜINO'],
    ['CIGÜEÑA', 'SIGÜEÑA'],
  ])('preserves the pronounced u in %s', (input, expected) => {
    expect(transformText(input, baseOptions).output).toBe(expected);
  });

  it('preserves final s and z when changing them could shift the stress', () => {
    const result = transformText('casas, libros, feliz, capaz, lápiz, jamás, más', baseOptions);

    expect(result.output).toBe('kazas, livros, feliz, kapaz, lápiz, jamás, más');
    expect(result.replacements.map((item) => item.original)).toEqual(['casas', 'libros', 'capaz']);
  });

  it('still swaps final s and z in clear unaccented monosyllables', () => {
    expect(transformText('dos, mes, voz, luz', baseOptions).output).toBe('doz, mez, bos, lus');
  });

  it('keeps decomposed diacritics with the word and preserves original offsets', () => {
    const penguin = 'pingüino'.normalize('NFD');
    const stork = 'CIGÜEÑA'.normalize('NFD');
    const pencil = 'lápiz'.normalize('NFD');
    const input = `👋 ${penguin}, ${stork}, ${pencil}.`;
    const result = transformText(input, { ...baseOptions, mode: 'manual' });

    expect(result.output).toBe(`👋 ${penguin}, SIGÜEÑA, ${pencil}.`);
    expect(result.stats.tokenCount).toBe(3);
    expect(result.replacements).toHaveLength(1);
    const [replacement] = result.replacements;
    expect(input.slice(replacement.start, replacement.end)).toBe(stork);
    expect(replacement.alternatives).toEqual(['SIGÜEÑA']);
  });

  it('rewrites the uploaded lyric excerpt aggressively', () => {
    const result = transformText(
      'Debes saber\nNo sé decirte\nCómo fue\nNi explicarme qué pasó',
      baseOptions,
    );

    expect(result.output).toBe(
      'Deves zaver\nNo zé desirte\nKómo fue\nNi eksplikarme ké pazó',
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
