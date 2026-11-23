import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  convertText,
  outputText,
  scoreAnswer,
  spellText,
  summaryText,
  type HistoryEntry,
  type QuizDirection,
  type QuizMode,
  type QuizProgress,
  type QuizQuestion,
  type ToolState,
} from './types';

const VALID_MODES: ToolState['mode'][] = ['convert', 'quiz', 'reference'];
const VALID_DIRECTIONS: QuizDirection[] = ['code-to-word', 'word-to-code'];
const VALID_QUIZ_MODES: QuizMode[] = ['letters', 'letters-digits'];
const VALID_OUTPUT_FORMATS: ToolState['outputFormat'][] = ['inline', 'line'];

const EMPTY_QUIZ: QuizProgress = { answered: 0, correct: 0, streak: 0, bestStreak: 0 };

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    mode: state.mode,
    sampleText: state.sampleText,
    outputFormat: state.outputFormat,
    quizDirection: state.quizDirection,
    quizMode: state.quizMode,
    currentQuestion: state.currentQuestion,
    quiz: state.quiz,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validQuiz(value: unknown): QuizProgress {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_QUIZ };
  const v = value as Record<string, unknown>;
  const num = (x: unknown): number =>
    typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
  return {
    answered: num(v.answered),
    correct: num(v.correct),
    streak: num(v.streak),
    bestStreak: num(v.bestStreak),
  };
}

function validQuestion(value: unknown): QuizQuestion | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.prompt !== 'string' || typeof v.answer !== 'string') return null;
  const direction: QuizDirection = VALID_DIRECTIONS.includes(v.direction as QuizDirection)
    ? (v.direction as QuizDirection)
    : 'code-to-word';
  return { prompt: v.prompt, answer: v.answer, direction };
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected NATO phonetic trainer state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    mode: VALID_MODES.includes(v.mode as ToolState['mode'])
      ? (v.mode as ToolState['mode'])
      : DEFAULT_STATE.mode,
    sampleText: stringOr(v.sampleText, DEFAULT_STATE.sampleText),
    outputFormat: VALID_OUTPUT_FORMATS.includes(v.outputFormat as ToolState['outputFormat'])
      ? (v.outputFormat as ToolState['outputFormat'])
      : DEFAULT_STATE.outputFormat,
    quizDirection: VALID_DIRECTIONS.includes(v.quizDirection as QuizDirection)
      ? (v.quizDirection as QuizDirection)
      : DEFAULT_STATE.quizDirection,
    quizMode: VALID_QUIZ_MODES.includes(v.quizMode as QuizMode)
      ? (v.quizMode as QuizMode)
      : DEFAULT_STATE.quizMode,
    currentQuestion: validQuestion(v.currentQuestion),
    quiz: validQuiz(v.quiz),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** Answer the current question: score it and queue a fresh one. */
export function answerQuestion(
  state: ToolState,
  answer: string,
  random: () => number = Math.random
): ToolState {
  if (!state.currentQuestion) return state;
  const scored = scoreAnswer(
    state.quiz,
    answer.trim().toLowerCase() === state.currentQuestion.answer.toLowerCase()
  );
  return {
    ...state,
    quiz: scored.quiz,
    currentQuestion: makeNextQuestion(state, random),
  };
}

/** Build the next question honoring the state's direction/mode. */
export function makeNextQuestion(
  state: ToolState,
  random: () => number = Math.random
): QuizQuestion {
  return makeDefaultQuestion(state.quizDirection, state.quizMode, random);
}

function makeDefaultQuestion(
  direction: QuizDirection,
  mode: QuizMode,
  random: () => number
): QuizQuestion {
  // Local re-implementation to keep tool-definition free of circular type deps.
  const pool =
    mode === 'letters-digits'
      ? [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'0123456789']
      : [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  const char = pool[Math.floor(random() * pool.length)] ?? 'A';
  if (direction === 'code-to-word') {
    return { prompt: char, answer: convertText(char), direction };
  }
  return { prompt: convertText(char), answer: char, direction };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const natoPhoneticTrainerTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { outputText, spellText, summaryText };
