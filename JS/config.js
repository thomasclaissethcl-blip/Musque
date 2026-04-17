/**
 * Paramètres généraux du POC.
 *
 * Exemple d'adaptation :
 * - changez `appTitle` et `heroTextDefault` pour un autre domaine
 * - ajustez le barème XP si vous souhaitez une progression plus lente
 * - modifiez `storageKey` pour créer un autre produit sans collision locale
 */
export const CONFIG = {
  storageKey: 'improlab-studio-poc-v1',
  appTitle: 'ImproLab Studio',
  heroTextDefault: 'Chaque capsule demande une mise en pratique sur instrument, puis vérifie la compréhension et le transfert par des exercices auto-corrigés.',
  xp: {
    lessonCompletion: 20,
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
