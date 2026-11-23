'use client';

import React from 'react';
import {
  NATO_ALPHABET,
  NATO_DIGITS,
  accuracyOf,
  convertText,
  isCorrectAnswer,
  outputText,
  toChips,
  spellText,
  type QuizDirection,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

const VIEWS: { value: ToolState['mode']; label: string }[] = [
  { value: 'convert', label: 'Convert' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'reference', label: 'Reference' },
];

function Chip({ char, code }: { char: string; code: string | null }) {
  return (
    <span
      data-testid="nato-chip"
      className={`inline-flex items-baseline gap-1 rounded-md border px-2 py-1 text-xs font-mono ${
        code
          ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100'
          : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      <span className="font-bold">{char === ' ' ? '␣' : char}</span>
      {code ? <span>{code}</span> : <span>—</span>}
    </span>
  );
}

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function ConvertView({
  state,
  onChange,
  onSaveHistory,
}: {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}) {
  const chips = React.useMemo(() => toChips(state.sampleText), [state.sampleText]);
  const output = outputText(state);
  return (
    <div className="space-y-4">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
        Text to convert
        <input
          type="text"
          value={state.sampleText}
          onChange={(e) => onChange?.({ ...state, sampleText: e.target.value })}
          data-testid="input-text"
          className={inputClass}
          placeholder="Type anything, e.g. SOS 911"
        />
      </label>

      <div
        className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
        data-testid="result-card"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">NATO output</span>
          <CopyButton value={output} testid="btn-copy-inline" />
        </div>
        <p className="break-words font-mono text-sm" data-testid="nato-output">
          {convertText(state.sampleText) || '—'}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5" data-testid="chip-row">
          {chips.map((chip, i) => (
            <Chip key={`${chip.char}-${i}`} char={chip.char} code={chip.code} />
          ))}
        </div>
        {state.sampleText.trim() ? (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400" data-testid="spell-helper">
            {spellText(state.sampleText)}
          </p>
        ) : (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400" data-testid="empty-hint">
            Type text above to see it spoken in NATO terms.
          </p>
        )}
      </div>

      {onSaveHistory ? (
        <button
          type="button"
          onClick={() => onSaveHistory(output)}
          data-testid="btn-save-history"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Save conversion
        </button>
      ) : null}
    </div>
  );
}

function QuizView({
  state,
  onChange,
}: {
  state: ToolState;
  onChange?: (state: ToolState) => void;
}) {
  const [answer, setAnswer] = React.useState('');
  const [feedback, setFeedback] = React.useState<null | { correct: boolean }>(null);

  const submit = () => {
    if (!state.currentQuestion || !onChange) return;
    const correct = isCorrectAnswer(state.currentQuestion, answer);
    setFeedback({ correct });
    const streak = correct ? state.quiz.streak + 1 : 0;
    onChange({
      ...state,
      quiz: {
        answered: state.quiz.answered + 1,
        correct: state.quiz.correct + (correct ? 1 : 0),
        streak,
        bestStreak: Math.max(state.quiz.bestStreak, streak),
      },
      currentQuestion: null,
    });
    setAnswer('');
  };

  const acc = accuracyOf(state.quiz);

  return (
    <div className="space-y-4" data-testid="quiz-view">
      <div className="grid grid-cols-3 gap-2 text-center" data-testid="score-row">
        <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Answered</p>
          <p className="text-lg font-bold" data-testid="score-answered">
            {state.quiz.answered}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Accuracy</p>
          <p className="text-lg font-bold" data-testid="score-accuracy">
            {acc}%
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
          <p className="text-lg font-bold" data-testid="score-streak">
            {state.quiz.streak}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['code-to-word', 'word-to-code'] as QuizDirection[]).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => onChange?.({ ...state, quizDirection: dir, currentQuestion: null })}
            data-testid={`direction-${dir}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              state.quizDirection === dir
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {dir === 'code-to-word' ? 'Letter → word' : 'Word → letter'}
          </button>
        ))}
      </div>

      {state.currentQuestion ? (
        <div
          className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-800"
          data-testid="question-card"
        >
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            {state.currentQuestion.direction === 'code-to-word'
              ? 'Which NATO codeword is this?'
              : 'Which character does this codeword stand for?'}
          </p>
          <p className="font-mono text-3xl font-bold" data-testid="question-prompt">
            {state.currentQuestion.prompt}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              data-testid="quiz-answer"
              className={inputClass}
              placeholder="Your answer"
              aria-label="Quiz answer"
            />
            <button
              type="button"
              onClick={submit}
              data-testid="btn-submit-answer"
              className="rounded-md bg-blue-500 px-4 py-2 text-xs font-medium text-white hover:bg-blue-600"
            >
              Check
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChange?.({ ...state, currentQuestion: null })}
          disabled
          data-testid="btn-start-quiz"
          className="rounded-md bg-blue-500 px-4 py-2 text-xs font-medium text-white"
        >
          Waiting for next question…
        </button>
      )}

      {feedback ? (
        <p
          data-testid="quiz-feedback"
          className={
            feedback.correct
              ? 'text-sm text-green-600 dark:text-green-400'
              : 'text-sm text-red-600 dark:text-red-400'
          }
        >
          {feedback.correct ? 'Correct!' : 'Wrong — streak reset.'}
        </p>
      ) : null}
    </div>
  );
}

function ReferenceView() {
  return (
    <div className="space-y-4" data-testid="reference-view">
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3"
        data-testid="reference-letters"
      >
        {Object.entries(NATO_ALPHABET).map(([letter, word]) => (
          <div
            key={letter}
            className="flex items-baseline justify-between border-b border-gray-100 py-1 text-sm dark:border-gray-800"
          >
            <span className="font-mono font-bold">{letter}</span>
            <span data-testid={`code-${letter}`}>{word}</span>
          </div>
        ))}
      </div>
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3"
        data-testid="reference-digits"
      >
        {Object.entries(NATO_DIGITS).map(([digit, word]) => (
          <div
            key={digit}
            className="flex items-baseline justify-between border-b border-gray-100 py-1 text-sm dark:border-gray-800"
          >
            <span className="font-mono font-bold">{digit}</span>
            <span data-testid={`code-digit-${digit}`}>{word}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Pronunciation note: 9 is spoken &ldquo;Niner&rdquo; to avoid confusion with the German
        &ldquo;nein&rdquo;; A is spelled &ldquo;Alfa&rdquo; and J &ldquo;Juliett&rdquo; in the
        official ICAO spelling.
      </p>
    </div>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="nato-canvas">
      <div className="flex gap-2" data-testid="mode-tabs">
        {VIEWS.map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => onChange?.({ ...state, mode: view.value })}
            data-testid={`mode-tab-${view.value}`}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              state.mode === view.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {state.mode === 'convert' ? (
        <ConvertView state={state} onChange={onChange} onSaveHistory={onSaveHistory} />
      ) : null}
      {state.mode === 'quiz' ? <QuizView state={state} onChange={onChange} /> : null}
      {state.mode === 'reference' ? <ReferenceView /> : null}

      <div>
        <h3 className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          Saved conversions
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved conversions yet.
          </p>
        ) : (
          <ul
            className="space-y-1 text-xs text-gray-700 dark:text-gray-300"
            data-testid="history-list"
          >
            {state.history.map((entry, i) => (
              <li key={`${entry.createdAt}-${i}`} className="font-mono">
                {entry.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
