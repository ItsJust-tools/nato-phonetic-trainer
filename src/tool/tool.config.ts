import type { FeatureFlags, ExportFormat, ToolConfig } from '@itsjust/core';

export const templateBaseVersion = '1.4.0';

export const toolConfig: ToolConfig = {
  id: 'nato-phonetic-trainer',
  name: 'NATO Phonetic Alphabet Codeword Trainer',
  description:
    'Learn and drill the NATO phonetic alphabet with quizzes and a converter for any text.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf', 'json'] as ExportFormat[],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  } as FeatureFlags,
  theme: {
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    accentSubtle: 'rgba(37, 99, 235, 0.15)',
    brand: 'NATO Phonetic Alphabet Codeword Trainer',
    icon: '🔤',
  },
};

export default toolConfig;
