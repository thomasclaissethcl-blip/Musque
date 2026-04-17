import { CONFIG } from './config.js';

/**
 * Mini moteur de lecture de notes pour le navigateur.
 *
 * Ce module ne dépend d'aucune bibliothèque externe et reste compatible
 * avec un hébergement statique simple, par exemple GitHub Pages.
 *
 * Le format attendu pour une séquence est volontairement léger :
 * {
 *   title: 'Exemple A',
 *   tempo: 96,
 *   notes: [
 *     { note: 'C4', duration: 0.5 },
 *     { note: 'E4', duration: 0.5 },
 *     { note: 'G4', duration: 1 }
 *   ]
 * }
 */

let audioContext;

function getAudioContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx();
  }
  return audioContext;
}

function noteToFrequency(note) {
  const matches = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!matches) return 440;
  const [, letter, accidental = '', octaveStr] = matches;
  const octave = Number(octaveStr);
  const semitoneMap = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  let semitone = semitoneMap[letter];
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export async function playSequence(sequence) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  const tempo = sequence.tempo || 90;
  const beatSeconds = 60 / tempo;
  let currentTime = ctx.currentTime + 0.02;

  sequence.notes.forEach((item) => {
    const duration = Math.max(0.08, (item.duration || 0.5) * beatSeconds);
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = CONFIG.synth.defaultWaveform;
    oscillator.frequency.value = noteToFrequency(item.note || 'A4');

    gainNode.gain.setValueAtTime(0.0001, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(CONFIG.synth.defaultGain, currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration + 0.02);

    currentTime += duration + CONFIG.synth.noteGapSeconds;
  });
}

export function attachSequencePlayers(root = document) {
  root.querySelectorAll('[data-sequence-json]').forEach((button) => {
    if (button.dataset.boundPlayer === 'true') return;
    button.dataset.boundPlayer = 'true';
    button.addEventListener('click', async () => {
      const payload = button.dataset.sequenceJson;
      if (!payload) return;
      const sequence = JSON.parse(payload);
      await playSequence(sequence);
    });
  });
}