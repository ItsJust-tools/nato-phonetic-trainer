export type QuizDirection = 'code-to-word' | 'word-to-code';

export type QuizMode = 'letters' | 'letters-digits';

export interface QuizQuestion {
  /** The prompt shown to the user (letter, digit, or codeword). */
  prompt: string;
  /** The expected codeword (code-to-word) or source character (word-to-code). */
  answer: string;
  /** Quiz direction for this question. */
  direction: QuizDirection;
}

export interface QuizProgress {
  /** Total questions answered. */
  answered: number;
  /** Correct answers. */
  correct: number;
  /** Current consecutive correct-answer streak. */
  streak: number;
  /** Best streak achieved this session. */
  bestStreak: number;
}

export interface HistoryEntry {
  /** Short human readable description of the conversion. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Active tool view. */
  mode: 'convert' | 'quiz' | 'reference';
  /** Text to convert to NATO codewords. */
  sampleText: string;
  /** Output format for the converted result. */
  outputFormat: 'inline' | 'line';
  /** Quiz direction. */
  quizDirection: QuizDirection;
  /** Which symbol sets the quiz draws from. */
  quizMode: QuizMode;
  /** Current quiz question, when one is active. */
  currentQuestion: QuizQuestion | null;
  /** Cumulative quiz score stats. */
  quiz: QuizProgress;
  /** Saved conversions, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  mode: 'convert',
  sampleText: 'SOS 911',
  outputFormat: 'inline',
  quizDirection: 'code-to-word',
  quizMode: 'letters',
  currentQuestion: null,
  quiz: { answered: 0, correct: 0, streak: 0, bestStreak: 0 },
  history: [],
};

export const MAX_HISTORY = 20;

/** The 26 NATO codewords. */
export const NATO_ALPHABET: Record<string, string> = {
  A: 'Alfa',
  B: 'Bravo',
  C: 'Charlie',
  D: 'Delta',
  E: 'Echo',
  F: 'Foxtrot',
  G: 'Golf',
  H: 'Hotel',
  I: 'India',
  J: 'Juliett',
  K: 'Kilo',
  L: 'Lima',
  M: 'Mike',
  N: 'November',
  O: 'Oscar',
  P: 'Papa',
  Q: 'Quebec',
  R: 'Romeo',
  S: 'Sierra',
  T: 'Tango',
  U: 'Uniform',
  V: 'Victor',
  W: 'Whiskey',
  X: 'X-ray',
  Y: 'Yankee',
  Z: 'Zulu',
};

/** Pronunciations for digits 0-9. */
export const NATO_DIGITS: Record<string, string> = {
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Niner',
};

/** Common punctuation mapped to spoken words (empty string = silently skipped). */
export const NATO_PUNCTUATION: Record<string, string> = {
  '.': 'Stop',
  ',': 'Comma',
  '?': 'Question',
  '!': 'Exclamation',
  '-': 'Dash',
  ':': 'Colon',
  "'": 'Apostrophe',
  '"': 'Quote',
  ' ': 'Space',
};

/** All quizzable characters in quiz mode order. */
export const QUIZ_LETTERS: string[] = Object.keys(NATO_ALPHABET);
export const QUIZ_DIGITS: string[] = Object.keys(NATO_DIGITS);

/** Lookup a NATO word for any single character (case-insensitive); null when unmapped. */
export function lookupCode(char: string): string | null {
  if (char.length !== 1) return null;
  const upper = char.toUpperCase();
  if (upper in NATO_ALPHABET) return NATO_ALPHABET[upper] ?? null;
  if (upper in NATO_DIGITS) return NATO_DIGITS[upper] ?? null;
  if (char in NATO_PUNCTUATION) return NATO_PUNCTUATION[char] ?? null;
  return null;
}

export interface CodeChip {
  /** The original character. */
  char: string;
  /** The NATO word, or null for unmapped characters. */
  code: string | null;
}

/** Convert a string to per-character chips. */
export function toChips(text: string): CodeChip[] {
  return Array.from(text).map((char) => ({ char, code: lookupCode(char) }));
}

/** Convert text to NATO codewords joined with spaces; unmapped characters pass through. */
export function convertText(text: string): string {
  return Array.from(text)
    .map((char) => lookupCode(char) ?? char)
    .join(' ');
}

/** One codeword per line output. */
export function convertLines(text: string): string {
  return Array.from(text)
    .map((char) => lookupCode(char) ?? char)
    .join('\n');
}

/** Spelled-out word helper: " spoken as Alpha Bravo Charlie". */
export function spellText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return `${trimmed} spoken as ${convertText(trimmed)}`;
}

const QUIZ_POOLS: Record<QuizMode, string[]> = {
  letters: QUIZ_LETTERS,
  'letters-digits': [...QUIZ_LETTERS, ...QUIZ_DIGITS],
};

/** Build a random quiz question from the active pools. */
export function makeQuestion(
  direction: QuizDirection,
  mode: QuizMode,
  random: () => number = Math.random
): QuizQuestion {
  const pool = QUIZ_POOLS[mode] ?? QUIZ_POOLS.letters;
  const char: string = pool[Math.floor(random() * pool.length)] ?? QUIZ_LETTERS[0] ?? 'A';
  if (direction === 'code-to-word') {
    return { prompt: char, answer: lookupCode(char) ?? char, direction };
  }
  return { prompt: lookupCode(char) ?? char, answer: char, direction };
}

/** Check an answer case-insensitively against the expected codeword. */
export function isCorrectAnswer(question: QuizQuestion, answer: string): boolean {
  if (question.direction === 'word-to-code') {
    return answer.trim().toUpperCase() === question.answer.toUpperCase();
  }
  return answer.trim().toLowerCase() === question.answer.toLowerCase();
}

export interface ScoreResult {
  /** New cumulative progress after applying the answer. */
  quiz: QuizProgress;
  /** Whether the given answer was correct. */
  correct: boolean;
}

/** Update quiz progress: streak grows/sh resets, accuracy recomputes, best streak tracked. */
export function scoreAnswer(progress: QuizProgress, correct: boolean): ScoreResult {
  const streak = correct ? progress.streak + 1 : 0;
  return {
    correct,
    quiz: {
      answered: progress.answered + 1,
      correct: progress.correct + (correct ? 1 : 0),
      streak,
      bestStreak: Math.max(progress.bestStreak, streak),
    },
  };
}

/** Accuracy percentage (0-100); 0 when nothing answered. */
export function accuracyOf(progress: QuizProgress): number {
  if (progress.answered === 0) return 0;
  return Math.round((progress.correct / progress.answered) * 100);
}

/** Plain-text copy of the converted output. */
export function outputText(state: ToolState): string {
  return state.outputFormat === 'line'
    ? convertLines(state.sampleText)
    : convertText(state.sampleText);
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  if (state.mode === 'quiz') {
    const acc = accuracyOf(state.quiz);
    return `Quiz: ${state.quiz.correct}/${state.quiz.answered} (${acc}%) streak ${state.quiz.streak}`;
  }
  if (state.mode === 'reference') return 'Reference: 26 codewords + 10 digits';
  return outputText(state);
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return outputText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.sampleText === 'string' && typeof v.mode === 'string';
}

export { NATO_ALPHABET as ALPHABET, convertText as textToNato };
