
/**
 * Paramètres principaux d'Impro Lab.
 *
 * Le projet reste 100 % statique.
 * La progression se sauvegarde dans le navigateur et peut être exportée en JSON.
 */
export const CONFIG = {
  storageKey: 'impro-lab-prod',
  appTitle: 'Impro Lab',
  xp: {
    lessonCompletion: 30,
    exerciseSuccess: 10,
    reviewSuccess: 5,
    levelStep: 120,
  },
  review: {
    initialIntervalDays: 1,
    easyMultiplier: 2,
    hardIntervalDays: 1,
  },
};
