/**
 * Petit moteur sonore "MIDI navigateur".
 *
 * Ce module ne dépend d'aucune bibliothèque externe. Il lit des séquences de notes
 * décrites par leur numéro MIDI et une durée relative.
 *
 * Exemple d'adaptation :
 * - dans un autre domaine, on peut l'utiliser pour des consignes sonores,
 *   des signaux d'alerte, des bips de validation, ou des démonstrations simples
 * - pour un produit plus ambitieux, ce module peut être remplacé par Web MIDI,
 *   SoundFont ou une librairie de synthèse plus avancée
 */

let audioContext = null;

const instrumentProfiles = {
  warm: { type: 'triangle', attack: 0.02, release: 0.25, gain: 0.18 },
  electric: { type: 'square', attack: 0.01, release: 0.18, gain: 0.12 },
  bell: { type: 'sine', attack: 0.005, release: 0.45, gain: 0.16 },
};

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export async function playSequence(sequence = [], options = {}) {
  const context = getContext();
  if (context.state === 'suspended') {
    await context.resume();
  }

  const profile = instrumentProfiles[options.instrument] || instrumentProfiles.warm;
  const tempo = options.tempo || 92;
  const beatSeconds = 60 / tempo;
  let cursor = context.currentTime + 0.02;

  sequence.forEach((noteEvent) => {
    const duration = (noteEvent.duration || 0.5) * beatSeconds;
    if (noteEvent.midi !== null && noteEvent.midi !== undefined) {
      scheduleNote(context, noteEvent.midi, cursor, duration, profile);
    }
    cursor += duration;
  });
}

function scheduleNote(context, midi, startTime, duration, profile) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = profile.type;
  oscillator.frequency.value = midiToFrequency(midi);

  filter.type = 'lowpass';
  filter.frequency.value = profile.type === 'square' ? 1800 : 2400;

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(profile.gain, startTime + profile.attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.max(profile.attack + 0.02, duration + profile.release));

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + profile.release + 0.03);
}

export function describeSequence(sequence = []) {
  const notes = sequence.filter((event) => event.midi !== null && event.midi !== undefined).map((event) => event.midi);
  if (!notes.length) return 'Séquence sans note jouée.';
  const unique = [...new Set(notes)];
  return `${notes.length} notes, ${unique.length} hauteurs distinctes.`;
}
