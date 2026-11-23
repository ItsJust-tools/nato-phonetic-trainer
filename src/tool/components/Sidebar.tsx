'use client';

import React from 'react';
import { NATO_ALPHABET, NATO_DIGITS, NATO_PUNCTUATION, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="nato-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Views</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Convert — text to codewords</li>
          <li>Quiz — flashcard drill</li>
          <li>Reference — full table</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Quiz settings</h3>
        <label className="block text-xs text-gray-600 dark:text-gray-300">
          Direction
          <select
            value={state.quizDirection}
            onChange={(e) =>
              onChange({ ...state, quizDirection: e.target.value as ToolState['quizDirection'] })
            }
            data-testid="quiz-direction"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="code-to-word">Letter → codeword</option>
            <option value="word-to-code">Codeword → letter</option>
          </select>
        </label>
        <label className="mt-2 block text-xs text-gray-600 dark:text-gray-300">
          Symbols
          <select
            value={state.quizMode}
            onChange={(e) =>
              onChange({ ...state, quizMode: e.target.value as ToolState['quizMode'] })
            }
            data-testid="quiz-mode"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="letters">Letters only</option>
            <option value="letters-digits">Letters + digits</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => onChange({ ...state, currentQuestion: null })}
          data-testid="btn-new-question"
          className="mt-2 w-full rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
        >
          New question
        </button>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-score">
          {state.quiz.correct}/{state.quiz.answered} correct · best streak {state.quiz.bestStreak}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved conversions</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Codewords</h3>
        <ul className="space-y-0.5 text-xs text-gray-600 dark:text-gray-300">
          {Object.entries(NATO_ALPHABET)
            .slice(0, 6)
            .map(([letter, word]) => (
              <li key={letter} className="flex justify-between gap-2">
                <span className="font-mono">{letter}</span>
                <span>{word}</span>
              </li>
            ))}
          <li className="text-gray-500 dark:text-gray-400">…see Reference for all 26</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Digits & punctuation</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Digits: {Object.keys(NATO_DIGITS).length} mapped (9 is &ldquo;Niner&rdquo;). Punctuation:{' '}
          {Object.keys(NATO_PUNCTUATION).length} mapped, period is &ldquo;Stop&rdquo;.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current text and quiz
          progress; open it to restore this session.
        </p>
      </div>
    </div>
  );
};
