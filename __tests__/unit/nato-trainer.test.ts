import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  NATO_ALPHABET,
  NATO_DIGITS,
  NATO_PUNCTUATION,
  QUIZ_DIGITS,
  QUIZ_LETTERS,
  accuracyOf,
  convertLines,
  convertText,
  isCorrectAnswer,
  lookupCode,
  makeQuestion,
  outputText,
  scoreAnswer,
  spellText,
  summaryText,
  toChips,
  type QuizProgress,
  type ToolState,
} from '@/tool/types';
import { toolConfig } from '@/tool/tool.config';

describe('nato phonetic trainer config', () => {
  it('has the fixed slug and required config fields', () => {
    expect(toolConfig.id).toBe('nato-phonetic-trainer');
    expect(toolConfig.name).toBe('NATO Phonetic Alphabet Codeword Trainer');

    expect(toolConfig.version).toBe('1.0.0');
    expect(toolConfig.exportFormats.length).toBeGreaterThan(0);
    expect(toolConfig.features.sidebar).toBe(true);
  });
});

describe('nato alphabet data', () => {
  it('has 26 codewords and 10 digits', () => {
    expect(Object.keys(NATO_ALPHABET)).toHaveLength(26);
    expect(Object.keys(NATO_DIGITS)).toHaveLength(10);
    expect(Object.keys(QUIZ_LETTERS)).toHaveLength(26);
    expect(Object.keys(QUIZ_DIGITS)).toHaveLength(10);
  });

  it('uses official ICAO spellings for tricky words', () => {
    expect(NATO_ALPHABET.A).toBe('Alfa');
    expect(NATO_ALPHABET.J).toBe('Juliett');
    expect(NATO_ALPHABET.Q).toBe('Quebec');
    expect(NATO_DIGITS['9']).toBe('Niner');
    expect(NATO_PUNCTUATION['.']).toBe('Stop');
  });

  it('letters and digits are all distinct words', () => {
    const all = [...Object.values(NATO_ALPHABET), ...Object.values(NATO_DIGITS)];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('lookupCode', () => {
  it('maps letters case-insensitively', () => {
    expect(lookupCode('a')).toBe('Alfa');
    expect(lookupCode('A')).toBe('Alfa');
    expect(lookupCode('z')).toBe('Zulu');
    expect(lookupCode('Z')).toBe('Zulu');
  });

  it('maps digits', () => {
    expect(lookupCode('0')).toBe('Zero');
    expect(lookupCode('9')).toBe('Niner');
  });

  it('maps punctuation including space', () => {
    expect(lookupCode('.')).toBe('Stop');
    expect(lookupCode(',')).toBe('Comma');
    expect(lookupCode(' ')).toBe('Space');
  });

  it('returns null for unmapped characters and invalid input', () => {
    expect(lookupCode('#')).toBeNull();
    expect(lookupCode('ä')).toBeNull();
    expect(lookupCode('')).toBeNull();
    expect(lookupCode('AB')).toBeNull();
    expect(lookupCode('!'.repeat(3))).toBeNull();
  });
});

describe('convertText', () => {
  it('converts letters, digits and punctuation', () => {
    expect(convertText('sos')).toBe('Sierra Oscar Sierra');
    expect(convertText('911')).toBe('Niner One One');
    expect(convertText('A-1')).toBe('Alfa Dash One');
  });

  it('is case-insensitive', () => {
    expect(convertText('AbC')).toBe(convertText('abc'));
    expect(convertText('ABC')).toBe('Alfa Bravo Charlie');
  });

  it('passes unmapped characters through', () => {
    expect(convertText('a#b')).toBe('Alfa # Bravo');
    expect(convertText('')).toBe('');
  });

  it('converts every character with a space separator', () => {
    expect(convertText('x y')).toBe('X-ray Space Yankee');
  });
});

describe('convertLines', () => {
  it('joins with newlines instead of spaces', () => {
    expect(convertLines('ab')).toBe('Alfa\nBravo');
    expect(convertLines('1.')).toBe('One\nStop');
  });
});

describe('toChips', () => {
  it('builds per-character chips with codes', () => {
    const chips = toChips('a1.');
    expect(chips).toHaveLength(3);
    expect(chips[0]).toEqual({ char: 'a', code: 'Alfa' });
    expect(chips[1]).toEqual({ char: '1', code: 'One' });
    expect(chips[2]).toEqual({ char: '.', code: 'Stop' });
  });

  it('marks unmapped characters', () => {
    const chips = toChips('a#');
    expect(chips[1]).toEqual({ char: '#', code: null });
  });

  it('preserves spaces as chips', () => {
    expect(toChips('a b')[1]).toEqual({ char: ' ', code: 'Space' });
  });
});

describe('spellText', () => {
  it('creates a spoken-as helper line', () => {
    expect(spellText('SOS')).toBe('SOS spoken as Sierra Oscar Sierra');
  });

  it('trims surrounding whitespace', () => {
    expect(spellText('  ok  ')).toBe('ok spoken as Oscar Kilo');
  });

  it('returns empty for blank text', () => {
    expect(spellText('')).toBe('');
    expect(spellText('   ')).toBe('');
  });
});

const BASE_QUIZ: QuizProgress = { answered: 0, correct: 0, streak: 0, bestStreak: 0 };

describe('makeQuestion', () => {
  it('creates code-to-word questions from letters', () => {
    const q = makeQuestion('code-to-word', 'letters', () => 0);
    expect(q.prompt).toBe('A');
    expect(q.answer).toBe('Alfa');
    expect(q.direction).toBe('code-to-word');
  });

  it('creates word-to-code questions', () => {
    const q = makeQuestion('word-to-code', 'letters', () => 0);
    expect(q.prompt).toBe('Alfa');
    expect(q.answer).toBe('A');
    expect(q.direction).toBe('word-to-code');
  });

  it('includes digits in letters-digits mode', () => {
    // Random value 0.99 should land near the end of the 36-symbol pool.
    const q = makeQuestion('code-to-word', 'letters-digits', () => 0.999999);
    expect('0123456789'.includes(q.prompt) || QUIZ_LETTERS.includes(q.prompt)).toBe(true);
  });

  it('clamps out-of-range random input to a valid symbol', () => {
    const q = makeQuestion('code-to-word', 'letters', () => 42);
    expect(QUIZ_LETTERS).toContain(q.prompt);
  });
});

describe('isCorrectAnswer', () => {
  const q = { prompt: 'C', answer: 'Charlie', direction: 'code-to-word' as const };

  it('accepts case-insensitive codeword answers', () => {
    expect(isCorrectAnswer(q, 'charlie')).toBe(true);
    expect(isCorrectAnswer(q, 'CHARLIE')).toBe(true);
    expect(isCorrectAnswer(q, ' Charlie ')).toBe(true);
  });

  it('rejects wrong codewords', () => {
    expect(isCorrectAnswer(q, 'Bravo')).toBe(false);
    expect(isCorrectAnswer(q, '')).toBe(false);
  });

  it('accepts single letters for word-to-code questions', () => {
    const rq = { prompt: 'Charlie', answer: 'C', direction: 'word-to-code' as const };
    expect(isCorrectAnswer(rq, 'c')).toBe(true);
    expect(isCorrectAnswer(rq, 'C')).toBe(true);
    expect(isCorrectAnswer(rq, 'D')).toBe(false);
  });
});

describe('scoreAnswer', () => {
  it('counts correct answers, grows streak and best streak', () => {
    let progress = BASE_QUIZ;
    for (let i = 0; i < 3; i++) {
      const r = scoreAnswer(progress, true);
      expect(r.correct).toBe(true);
      progress = r.quiz;
    }
    expect(progress).toEqual({ answered: 3, correct: 3, streak: 3, bestStreak: 3 });
  });

  it('resets streak on wrong answers but keeps totals and best streak', () => {
    let progress = scoreAnswer(BASE_QUIZ, true).quiz;
    progress = scoreAnswer(progress, true).quiz;
    const wrong = scoreAnswer(progress, false);
    expect(wrong.correct).toBe(false);
    expect(wrong.quiz.streak).toBe(0);
    expect(wrong.quiz.answered).toBe(3);
    expect(wrong.quiz.correct).toBe(2);
    expect(wrong.quiz.bestStreak).toBe(2);
    // A later correct answer rebuilds the streak toward a new best.
    const again = scoreAnswer(wrong.quiz, true).quiz;
    expect(again.streak).toBe(1);
    expect(again.bestStreak).toBe(2);
    const best = scoreAnswer(scoreAnswer(again, true).quiz, true).quiz;
    expect(best.streak).toBe(3);
    expect(best.bestStreak).toBe(3);
  });

  it('never mutates the input progress object', () => {
    const before = { ...BASE_QUIZ };
    scoreAnswer(BASE_QUIZ, true);
    expect(BASE_QUIZ).toEqual(before);
  });
});

describe('accuracyOf', () => {
  it('is 0 with no answers', () => {
    expect(accuracyOf(BASE_QUIZ)).toBe(0);
  });

  it('computes rounded accuracy', () => {
    expect(accuracyOf({ answered: 3, correct: 2, streak: 0, bestStreak: 2 })).toBe(67);
    expect(accuracyOf({ answered: 4, correct: 4, streak: 4, bestStreak: 4 })).toBe(100);
    expect(accuracyOf({ answered: 2, correct: 0, streak: 0, bestStreak: 0 })).toBe(0);
  });
});

describe('outputText and summaryText', () => {
  const convertState: ToolState = {
    ...DEFAULT_STATE,
    mode: 'convert',
    sampleText: 'ab',
    outputFormat: 'inline',
  };

  it('uses inline or line output based on format', () => {
    expect(outputText(convertState)).toBe('Alfa Bravo');
    expect(outputText({ ...convertState, outputFormat: 'line' })).toBe('Alfa\nBravo');
  });

  it('summarizes convert, quiz and reference modes', () => {
    expect(summaryText(convertState)).toBe('Alfa Bravo');
    const quizState: ToolState = {
      ...convertState,
      mode: 'quiz',
      quiz: { answered: 4, correct: 2, streak: 1, bestStreak: 2 },
    };
    expect(summaryText(quizState)).toBe('Quiz: 2/4 (50%) streak 1');
    expect(summaryText({ ...convertState, mode: 'reference' })).toBe(
      'Reference: 26 codewords + 10 digits'
    );
  });

  it('handles empty text output', () => {
    expect(outputText({ ...convertState, sampleText: '' })).toBe('');
  });
});
