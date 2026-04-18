/**
 * Paramètres principaux du gabarit.
 *
 * Adaptez surtout :
 * - appTitle et hero messages
 * - storageKey pour éviter les collisions avec un autre projet
 * - barème XP si vous voulez une progression plus lente ou plus rapide
 */
export const CONFIG = {
  storageKey: 'microlearning-studio-template-v1',
  appTitle: 'Microlearning Studio',
  xp: {
    lessonCompletion: 20,
    exerciseSuccess: 10,
    reviewSuccess: 5,
    levelStep: 100,
  },
  review: {
    initialIntervalDays: 1,
    easyMultiplier: 2,
    hardIntervalDays: 1,
  },
};
