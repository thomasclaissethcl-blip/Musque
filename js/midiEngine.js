
/**
 * Moteur audio léger pour site statique.
 *
 * Il utilise Web Audio pour rester compatible avec GitHub Pages et sans dépendance.
 * Types gérés :
 * - sequence : notes successives
 * - drone : note tenue ou accord tenu
 * - chord_progression : suite d'accords lente
 * - pulse_loop : boucle de pulsation / clic doux
 *
 * Exemple minimal :
 * {
 *   type: 'sequence',
 *   title: 'Motif',
 *   tempo: 92,
 *   notes: [{ note: 'C4', duration: 0.5 }, { note: 'E4', duration: 0.5 }],
 *   loopable: true
 * }
 */

let audioContext = null;
let activeEngine = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextCtor();
  }
  return audioContext;
}

function noteToFrequency(note) {
  const match = /^([A-G])(#|b)?(\d)$/.exec(note || 'A4');
  if (!match) return 440;
  const [, letter, accidental = '', octaveRaw] = match;
  const octave = Number(octaveRaw);
  const semitoneMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitone = semitoneMap[letter];
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function makeVoice(ctx, { frequency, startTime, duration, type = 'triangle', gain = 0.08, filterHz = 2200 }) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterHz, startTime);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.6), startTime + Math.max(0.04, duration - 0.08));
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
  return oscillator;
}

function stopActiveEngine() {
  if (!activeEngine) return;
  activeEngine.cancelled = true;
  if (activeEngine.timeoutId) clearTimeout(activeEngine.timeoutId);
  if (activeEngine.rafId) cancelAnimationFrame(activeEngine.rafId);
  activeEngine = null;
}

export function stopAllPlayers(root = document) {
  stopActiveEngine();
  root.querySelectorAll('.audio-card.is-playing').forEach((card) => card.classList.remove('is-playing'));
  root.querySelectorAll('.player-button').forEach((button) => { button.textContent = 'Lecture'; });
}

async function ensureRunning() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}

function getTempoFromCard(card, fallback = 92) {
  const slider = card.querySelector('[data-player-tempo]');
  return Number(slider?.value || fallback);
}

function isLoopEnabled(card, fallback = false) {
  return card.querySelector('[data-player-loop]')?.checked ?? fallback;
}

function updateButtonState(card, playing) {
  const button = card.querySelector('.player-button');
  if (!button) return;
  button.textContent = playing ? 'Arrêter' : 'Lecture';
  card.classList.toggle('is-playing', playing);
}

function animateProgress(card, startTime, durationSeconds) {
  const progress = card.querySelector('.player-progress-fill');
  if (!progress) return;
  const step = () => {
    if (!activeEngine || activeEngine.cancelled) {
      progress.style.width = '0%';
      return;
    }
    const ctx = getAudioContext();
    const elapsed = Math.max(0, ctx.currentTime - startTime);
    const ratio = Math.min(1, elapsed / Math.max(0.1, durationSeconds));
    progress.style.width = `${Math.round(ratio * 100)}%`;
    if (ratio < 1) activeEngine.rafId = requestAnimationFrame(step);
  };
  activeEngine.rafId = requestAnimationFrame(step);
}

function scheduleSequence(ctx, track, tempo) {
  const beat = 60 / tempo;
  let currentTime = ctx.currentTime + 0.03;
  (track.notes || []).forEach((item) => {
    const duration = Math.max(0.08, (item.duration || 0.5) * beat);
    makeVoice(ctx, {
      frequency: noteToFrequency(item.note || 'A4'),
      startTime: currentTime,
      duration,
      type: 'triangle',
      gain: 0.06,
      filterHz: 2500,
    });
    currentTime += duration + 0.015;
  });
  return Math.max(0.1, currentTime - ctx.currentTime);
}

function scheduleDrone(ctx, track, tempo) {
  const beat = 60 / tempo;
  const root = track.root || 'C3';
  const notes = track.notes?.length ? track.notes : [root, root.replace(/(\d)/, (m) => String(Number(m) + 1))];
  const duration = Math.max(2, (track.durationBeats || 8) * beat);
  const startTime = ctx.currentTime + 0.03;
  notes.forEach((note, index) => {
    makeVoice(ctx, {
      frequency: noteToFrequency(note),
      startTime,
      duration,
      type: index === 0 ? 'sine' : 'triangle',
      gain: index === 0 ? 0.05 : 0.025,
      filterHz: 1800,
    });
  });
  return duration;
}

function scheduleChordProgression(ctx, track, tempo) {
  const beat = 60 / tempo;
  const startTime = ctx.currentTime + 0.03;
  let currentTime = startTime;
  (track.chords || []).forEach((chord) => {
    const duration = Math.max(0.5, (chord.beats || 4) * beat);
    (chord.notes || []).forEach((note, index) => {
      makeVoice(ctx, {
        frequency: noteToFrequency(note),
        startTime: currentTime,
        duration,
        type: index === 0 ? 'triangle' : 'sine',
        gain: index === 0 ? 0.05 : 0.032,
        filterHz: 1600,
      });
    });
    currentTime += duration;
  });
  return Math.max(0.1, currentTime - ctx.currentTime);
}

function schedulePulseLoop(ctx, track, tempo) {
  const beat = 60 / tempo;
  let currentTime = ctx.currentTime + 0.03;
  const pattern = track.pattern?.length ? track.pattern : [1, 0, 1, 0, 1, 0, 1, 0];
  pattern.forEach((pulse, index) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(index % 4 === 0 ? 1100 : 800, currentTime);
    const gain = pulse ? 0.018 : 0.006;
    gainNode.gain.setValueAtTime(0.0001, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(gain, currentTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.04);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(currentTime);
    osc.stop(currentTime + 0.05);
    currentTime += beat;
  });
  return Math.max(0.1, currentTime - ctx.currentTime);
}

function scheduleTrack(ctx, kind, track, tempo) {
  switch (kind) {
    case 'drone':
      return scheduleDrone(ctx, track, tempo);
    case 'chord_progression':
      return scheduleChordProgression(ctx, track, tempo);
    case 'pulse_loop':
      return schedulePulseLoop(ctx, track, tempo);
    case 'sequence':
    default:
      return scheduleSequence(ctx, track, tempo);
  }
}

async function playTrack(card, kind, track) {
  stopAllPlayers(card.closest('.workshop-player') || document);
  const ctx = await ensureRunning();
  const tempo = getTempoFromCard(card, track.tempo || 92);
  const loop = isLoopEnabled(card, !!track.loopable);
  updateButtonState(card, true);

  const durationSeconds = scheduleTrack(ctx, kind, track, tempo);
  activeEngine = { card, cancelled: false, timeoutId: null, rafId: null };
  animateProgress(card, ctx.currentTime, durationSeconds);

  const rerun = async () => {
    if (!activeEngine || activeEngine.cancelled) return;
    if (!loop) {
      updateButtonState(card, false);
      activeEngine = null;
      return;
    }
    const nextTempo = getTempoFromCard(card, track.tempo || 92);
    const nextDuration = scheduleTrack(ctx, kind, track, nextTempo);
    animateProgress(card, ctx.currentTime, nextDuration);
    activeEngine.timeoutId = setTimeout(rerun, nextDuration * 1000);
  };

  activeEngine.timeoutId = setTimeout(rerun, durationSeconds * 1000);
}

export function attachAudioPlayers(root = document) {
  root.querySelectorAll('.audio-card').forEach((card) => {
    const button = card.querySelector('.player-button');
    const slider = card.querySelector('[data-player-tempo]');
    const output = card.querySelector('.tempo-readout');
    if (slider && output) {
      output.textContent = `${slider.value} BPM`;
      if (slider.dataset.boundTempo !== 'true') {
        slider.dataset.boundTempo = 'true';
        slider.addEventListener('input', () => {
          output.textContent = `${slider.value} BPM`;
        });
      }
    }
    if (!button || button.dataset.boundPlayer === 'true') return;
    button.dataset.boundPlayer = 'true';
    button.addEventListener('click', async () => {
      if (activeEngine?.card === card) {
        stopAllPlayers(root);
        return;
      }
      const payload = button.dataset.playerPayload;
      const kind = button.dataset.playerKind || 'sequence';
      if (!payload) return;
      const track = JSON.parse(payload);
      await playTrack(card, kind, track);
    });
  });
}
