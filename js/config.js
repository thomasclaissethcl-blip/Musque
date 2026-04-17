/**
 * Paramètres principaux du POC Impro Lab.
 *
 * Pour adapter ce projet à un autre domaine, modifiez surtout :
 * - appTitle et storageKey
 * - le barème XP
 * - les textes présents dans index.html et README.md
 */
export const CONFIG = {
  storageKey: 'impro-lab-poc-v1',
  appTitle: 'Impro Lab',
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
  synth: {
    defaultWaveform: 'triangle',
    defaultGain: 0.07,
    noteGapSeconds: 0.03,
  },
};