import { CONFIG } from './config.js';
import { todayISO } from './utils.js';

/**
 * Sauvegarde front-end.
 *
 * Exemple d'adaptation :
 * - pour un autre domaine, la structure d'état peut rester identique
 * - seules les données métier changent, pas le stockage local
 */
export function createDefaultState() {
  return {
    profile: {
      xp: 0,
      level: 1,
      streak: 0,
      lastStudyDate: null,
      completedLessons: [],
      history: [],
    },
    learningMode: 'free',
    selectedPathway: null,
    pathwayProgress: {},
    review: {},
    dailyProgress: {
      date: todayISO(),
      lessonsCompletedToday: 0,
      reviewDoneToday: 0,
      quizDoneToday: 0,
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return createDefaultState();
    return { ...createDefaultState(), ...JSON.parse(raw) };
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'improlab-progression.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function importState(file) {
  const text = await file.text();
  return JSON.parse(text);
}
