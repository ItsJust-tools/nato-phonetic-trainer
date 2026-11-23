import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE, MAX_HISTORY } from '@/tool/types';
import {
  answerQuestion,
  deserializeState,
  makeNextQuestion,
  natoPhoneticTrainerTool,
  roundTrips,
  serializeState,
  withHistory,
} from '@/tool/tool-definition';
import toolConfig from '@/tool/tool.config';

describe('tool definition basics', () => {
  it('wires the tool to the config id and state', () => {
    expect(natoPhoneticTrainerTool.id).toBe(toolConfig.id);
    expect(natoPhoneticTrainerTool.id).toBe('nato-phonetic-trainer');
    expect(natoPhoneticTrainerTool.name).toBe(toolConfig.name);
    expect(natoPhoneticTrainerTool.version).toBe(toolConfig.version);
    expect(natoPhoneticTrainerTool.initialState).toEqual(DEFAULT_STATE);
    expect(natoPhoneticTrainerTool.exporters).toHaveLength(4);
  });
});

describe('withHistory', () => {
  it('prepends entries newest first and caps length', () => {
    let state: typeof DEFAULT_STATE = { ...DEFAULT_STATE, history: [] };
    for (let i = 0; i < MAX_HISTORY + 3; i++) {
      state = withHistory(state, `entry-${i}`, new Date(2026, 0, 1, 12, i));
    }
    expect(state.history).toHaveLength(MAX_HISTORY);
    expect(state.history[0]?.text).toBe(`entry-${MAX_HISTORY + 2}`);
    expect(state.history[MAX_HISTORY - 1]?.text).toBe('entry-3');
  });

  it('records ISO timestamps', () => {
    const now = new Date('2026-11-23T10:00:00Z');
    const state = withHistory({ ...DEFAULT_STATE, history: [] }, 'Alfa', now);
    expect(state.history[0]?.createdAt).toBe('2026-11-23T10:00:00.000Z');
  });
});

describe('serialize / deserialize round-trip', () => {
  it('round-trips a full state object', () => {
    const state = {
      ...DEFAULT_STATE,
      sampleText: 'mayday 05',
      outputFormat: 'line' as const,
      quizDirection: 'word-to-code' as const,
      quizMode: 'letters-digits' as const,
      currentQuestion: { prompt: 'Echo', answer: 'E', direction: 'word-to-code' as const },
      quiz: { answered: 7, correct: 5, streak: 2, bestStreak: 4 },
      history: [{ text: 'Alfa Bravo', createdAt: '2026-11-23T08:00:00.000Z' }],
    };
    const json = serializeState(state);
    const parsed: unknown = JSON.parse(json);
    const restored = deserializeState(parsed);
    expect(restored.success).toBe(true);
    if (!restored.success) throw new Error('expected success');
    expect(restored.data).toEqual(state);
    expect(roundTrips(state)).toBe(true);
  });

  it('round-trips the default state', () => {
    expect(roundTrips(DEFAULT_STATE)).toBe(true);
    expect(roundTrips({ ...DEFAULT_STATE, currentQuestion: null })).toBe(true);
  });

  it('repairs invalid fields with defaults', () => {
    const result = deserializeState({
      mode: 'banana',
      sampleText: 42,
      outputFormat: 'nope',
      quizDirection: 'sideways',
      quizMode: 'emoji',
      quiz: { answered: -3, correct: 'many', streak: null, bestStreak: 'x' },
      history: 'not-an-array',
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.data.mode).toBe(DEFAULT_STATE.mode);
    expect(result.data.sampleText).toBe(DEFAULT_STATE.sampleText);
    expect(result.data.outputFormat).toBe(DEFAULT_STATE.outputFormat);
    expect(result.data.quizDirection).toBe(DEFAULT_STATE.quizDirection);
    expect(result.data.quizMode).toBe(DEFAULT_STATE.quizMode);
    expect(result.data.quiz).toEqual({ answered: 0, correct: 0, streak: 0, bestStreak: 0 });
    expect(result.data.history).toEqual([]);
    expect(result.data.currentQuestion).toBeNull();
  });

  it('rejects non-object payloads', () => {
    for (const bad of [null, 'text', 42, [], true, undefined]) {
      const result = deserializeState(bad);
      expect(result.success).toBe(false);
      if (result.success) throw new Error('expected failure for ' + String(bad));
      expect(result.error).toContain('Invalid data format');
    }
  });

  it('drops malformed history entries and truncates to MAX_HISTORY', () => {
    const history = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
      text: `t${i}`,
      createdAt: '2026-01-01T00:00:00.000Z',
    }));
    const result = deserializeState({
      history: [...history, { text: 'nope' }, 7, 'x', null],
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.data.history).toHaveLength(MAX_HISTORY);
    expect(
      result.data.history.every(
        (e) => typeof e.text === 'string' && typeof e.createdAt === 'string'
      )
    ).toBe(true);
  });

  it('rejects malformed questions and non-finite quiz numbers', () => {
    const result = deserializeState({
      currentQuestion: { prompt: 'A' },
      quiz: { answered: Number.NaN, correct: 1.7, streak: Infinity, bestStreak: -1 },
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.data.currentQuestion).toBeNull();
    expect(result.data.quiz).toEqual({ answered: 0, correct: 1, streak: 0, bestStreak: 0 });
  });

  it('keeps valid questions', () => {
    const q = { prompt: 'B', answer: 'Bravo', direction: 'code-to-word' as const };
    const result = deserializeState({ currentQuestion: q });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected success');
    expect(result.data.currentQuestion).toEqual(q);
  });

  it('serializes all state fields', () => {
    const json = serializeState(DEFAULT_STATE);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(
      [
        'currentQuestion',
        'history',
        'mode',
        'outputFormat',
        'quiz',
        'quizDirection',
        'quizMode',
        'sampleText',
      ].sort()
    );
  });
});

describe('quiz state transitions', () => {
  it('answerQuestion scores correct answers and moves to the next question', () => {
    const state = {
      ...DEFAULT_STATE,
      quiz: { answered: 1, correct: 1, streak: 1, bestStreak: 1 },
      currentQuestion: { prompt: 'K', answer: 'Kilo', direction: 'code-to-word' as const },
    };
    const next = answerQuestion(state, 'kilo', () => 0.2);
    expect(next.quiz).toEqual({ answered: 2, correct: 2, streak: 2, bestStreak: 2 });
    expect(next.currentQuestion).not.toBeNull();
    expect(next.currentQuestion?.direction).toBe('code-to-word');
    expect(next.quizDirection).toBe('code-to-word');
  });

  it('scores wrong answers with a streak reset', () => {
    const state = {
      ...DEFAULT_STATE,
      quiz: { answered: 3, correct: 3, streak: 3, bestStreak: 3 },
      currentQuestion: { prompt: 'K', answer: 'Kilo', direction: 'code-to-word' as const },
    };
    const next = answerQuestion(state, 'Karma', () => 0.1);
    expect(next.quiz.answered).toBe(4);
    expect(next.quiz.correct).toBe(3);
    expect(next.quiz.streak).toBe(0);
    expect(next.quiz.bestStreak).toBe(3);
  });

  it('trims whitespace in answers', () => {
    const state = {
      ...DEFAULT_STATE,
      currentQuestion: { prompt: 'H', answer: 'Hotel', direction: 'code-to-word' as const },
    };
    expect(answerQuestion(state, '   Hotel ').quiz.correct).toBe(1);
  });

  it('is case-insensitive for codeword answers', () => {
    const state = {
      ...DEFAULT_STATE,
      currentQuestion: { prompt: 'H', answer: 'Hotel', direction: 'code-to-word' as const },
    };
    expect(answerQuestion(state, 'hOtEl').quiz.correct).toBe(1);
    expect(answerQuestion(state, 'motel').quiz.correct).toBe(0);
  });

  it('is a no-op without an active question', () => {
    const state = { ...DEFAULT_STATE, currentQuestion: null };
    const next = answerQuestion(state, 'whatever');
    expect(next).toEqual(state);
  });

  it('makeNextQuestion honors letters-digits mode', () => {
    const state = { ...DEFAULT_STATE, quizMode: 'letters-digits' as const };
    const q = makeNextQuestion(state, () => 0.999999);
    expect('0123456789'.includes(q.prompt) || /^[A-Z]$/.test(q.prompt)).toBe(true);
    const wordQ = makeNextQuestion({ ...state, quizDirection: 'word-to-code' }, () => 0);
    expect(wordQ.prompt).toBe('Alfa');
    expect(wordQ.answer).toBe('A');
  });

  it('natoPhoneticTrainerTool deserializes shared payloads through the Tool interface', () => {
    const state = { ...DEFAULT_STATE, sampleText: 'roger' };
    const res = natoPhoneticTrainerTool.deserialize(
      JSON.parse(natoPhoneticTrainerTool.serialize(state))
    );
    expect(res.success).toBe(true);
    if (!res.success) throw new Error('expected success');
    expect(res.data.sampleText).toBe('roger');
    expect(natoPhoneticTrainerTool.deserialize('nope').success).toBe(false);
  });
});
