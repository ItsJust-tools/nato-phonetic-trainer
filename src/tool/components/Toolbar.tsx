'use client';

import React from 'react';
import type { ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label="NATO phonetic trainer controls"
      >
        <button
          type="button"
          onClick={() =>
            onChange({ ...state, quiz: { answered: 0, correct: 0, streak: 0, bestStreak: 0 } })
          }
          data-testid="btn-reset-score"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset score
        </button>
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-output"
            className="rounded-md bg-blue-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
          >
            Copy output
          </button>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
        Output format
        <select
          value={state.outputFormat}
          onChange={(e) =>
            onChange({ ...state, outputFormat: e.target.value as ToolState['outputFormat'] })
          }
          data-testid="output-format"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="inline">Inline</option>
          <option value="line">One per line</option>
        </select>
      </label>
    </div>
  );
};
