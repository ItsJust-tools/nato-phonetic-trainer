import { DEFAULT_STATE, type ToolState } from './types';

export const VIEWS: { value: ToolState['mode']; label: string; hint: string }[] = [
  { value: 'convert', label: 'Convert', hint: 'text to NATO codewords' },
  { value: 'quiz', label: 'Quiz', hint: 'flashcard drill with scoring' },
  { value: 'reference', label: 'Reference', hint: 'full codeword table' },
];

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.sampleText === 'string' && typeof v.mode === 'string' && DEFAULT_STATE !== undefined
  );
}
