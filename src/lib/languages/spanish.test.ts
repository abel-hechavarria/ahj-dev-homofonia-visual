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
    expect(transformText('Hola Yo TAXI', baseOptions).output).toBe('Ola Llo TAKSI');
  });

  it('preserves the case of surviving letters and individual changes', () => {
    const result = transformText('McCasa HoLa aChACasa aChA CeNa XimeNa', baseOptions);
    expect(result.output).toBe('MkKaza oLa aChAKaza aChA SeNa JimeNa');
    expect(result.replacements.map(item => item.original)).not.toContain('aChA');
  });

  it('propagates capitals through contractions and expansions in mixed-case words', () => {
    expect(transformText('aQuÍ aqUí caLLe calLe aYo taXi', baseOptions).output)
      .toBe('aKÍ aKí kaYe kaYe aLLo taKSi');
  });

  it('keeps mixed case with decomposed accents and lets manual mode restore the exact input', () => {
    const input = 'cAnCión'.normalize('NFD');
    const manual = { ...baseOptions, mode: 'manual' as const };
    const result = transformText(input, manual);
    expect(result.output).toBe('kAnSión');
    const [replacement] = result.replacements;
    expect(input.slice(replacement.start, replacement.end)).toBe(input);
    expect(transformText(input, {
      ...manual,
      manualSelections: { [replacement.id]: '__original__' },
    }).output).toBe(input);
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

  it('gives NFC and NFD the same output, counts and review options', () => {
    const input = '🎵 ¡canción, canción y pingüino!\r\nCIGÜEÑA, MÉXICO y año.';
    const nfc = transformText(input, baseOptions);
    const decomposed = input.normalize('NFD');
    const nfd = transformText(decomposed, baseOptions);

    expect(nfc.output).toBe('🎵 ¡kansión, kansión i pingüino!\r\nSIGÜEÑA, MÉJIKO i año.');
    expect(nfd.output.normalize('NFC')).toBe(nfc.output);
    expect(nfc.stats).toMatchObject({ tokenCount: 8, replacementCount: 6 });
    expect(nfd.stats).toEqual(nfc.stats);
    expect(nfd.replacements.map(({ id, alternatives, ruleIds }) => ({ id, alternatives, ruleIds })))
      .toEqual(nfc.replacements.map(({ id, alternatives, ruleIds }) => ({ id, alternatives, ruleIds })));
    for (const { start, end, original } of nfd.replacements) {
      expect(decomposed.slice(start, end)).toBe(original);
    }
  });

  it('restores only the selected occurrence with its original normalization', () => {
    const input = '🎵 canción y canción';
    const manual = { ...baseOptions, mode: 'manual' as const };
    const [first] = transformText(input, manual).replacements;
    const options = { ...manual, manualSelections: { [first.id]: '__original__' } };
    const nfc = transformText(input, options);
    const nfd = transformText(input.normalize('NFD'), options);

    expect(nfc.output).toBe('🎵 canción i kansión');
    expect(nfd.output).toBe(`🎵 ${'canción'.normalize('NFD')} i kansión`);
    expect(nfd.stats).toEqual(nfc.stats);
    expect(nfd.stats).toMatchObject({ tokenCount: 3, replacementCount: 2 });
  });

  it('uses contextual pronunciations for x and protects uncertain cases', () => {
    const input = 'xilófono xenofobia antixenófobo México mexicano Oaxaca Texas Ximena Ximénez Mexía';
    expect(transformText(input, baseOptions).output).toBe(
      'silófono senofovia antisenófovo Méjiko mejikano Oajaka Tejas Jimena Jiménez Mejía',
    );
    expect(transformText('taxi examen relax excursión exacto Xola mixiote Xavier', baseOptions).output)
      .toBe('taksi eksamen relaks exkurzión exakto Xola mixiote Xabier');
  });

  it('matches uppercase and decomposed names before applying the general x rule', () => {
    const result = transformText('MÉXICO'.normalize('NFD'), baseOptions);
    expect(result.output).toBe('MÉJIKO');
    expect(result.replacements[0].ruleIds).toContain('x-j');
  });

  it('keeps pronounced h and protects ch while still removing ordinary silent h', () => {
    const input = 'hámster HÁMSTERS haiku hachís dírham Hawái hielo hueso hola deshacer chico';
    const result = transformText(input, baseOptions);
    expect(result.output).toBe('hámzter HÁMZTERS haiku hachís dírham Hawái hielo huezo ola dezaser chiko');
    expect(result.replacements.find((item) => item.original === 'hámster')?.ruleIds)
      .not.toContain('silent-h');
  });

  it('rewrites the uploaded lyric excerpt aggressively', () => {
    const result = transformText(
      'Debes saber\nNo sé decirte\nCómo fue\nNi explicarme qué pasó',
      baseOptions,
    );

    expect(result.output).toBe(
      'Deves zaver\nNo zé desirte\nKómo fue\nNi explikarme ké pazó',
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
