let audioContext = null;
let activePlayer = null;

const NOTE_INDEX = { C: 0, Db: 1, 'C#': 1, D: 2, Eb: 3, 'D#': 3, E: 4, F: 5, Gb: 6, 'F#': 6, G: 7, Ab: 8, 'G#': 8, A: 9, Bb: 10, 'A#': 10, B: 11 };
const CHROMATIC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const DEGREE_MAP = {
  I: { degree: 0, quality: 'maj' }, ii: { degree: 1, quality: 'min' }, II: { degree: 1, quality: 'maj' },
  iii: { degree: 2, quality: 'min' }, III: { degree: 2, quality: 'maj' }, IV: { degree: 3, quality: 'maj' },
  '#iv': { degree: 3, quality: 'dim', shift: 1 }, 'bV': { degree: 4, quality: 'maj', shift: -1 }, V: { degree: 4, quality: 'maj' },
  vi: { degree: 5, quality: 'min' }, VI: { degree: 5, quality: 'maj' }, vii: { degree: 6, quality: 'dim' }, VII: { degree: 6, quality: 'maj' },
  i: { degree: 0, quality: 'min' }, iv: { degree: 3, quality: 'min' }, v: { degree: 4, quality: 'min' },
  'bVII': { degree: 6, quality: 'maj', shift: -1 }, 'bVI': { degree: 5, quality: 'maj', shift: -1 }, 'bIII': { degree: 2, quality: 'maj', shift: -1 },
};

function getAudioContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctx();
  }
  return audioContext;
}

function noteToMidi(note = 'C4') {
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!m) return 60;
  const key = `${m[1]}${m[2] || ''}`;
  return (Number(m[3]) + 1) * 12 + NOTE_INDEX[key];
}

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function noteNameToMidi(name, octave = 3) {
  return (octave + 1) * 12 + NOTE_INDEX[name];
}

function createVoice(ctx, destination, { frequency, startTime, duration, type = 'triangle', gain = 0.07, filterHz = 2600 }) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterHz, startTime);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  amp.gain.setValueAtTime(0.0001, startTime);
  amp.gain.exponentialRampToValueAtTime(gain, startTime + 0.01);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.55), startTime + Math.max(0.05, duration - 0.06));
  amp.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(filter);
  filter.connect(amp);
  amp.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

function ensureMaster(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  return master;
}

function parseSignature(signature = '4/4') {
  const [num, den] = signature.split('/').map(Number);
  return { numerator: num || 4, denominator: den || 4 };
}

function beatsToSeconds(beats, tempo, signature = '4/4') {
  const { denominator } = parseSignature(signature);
  const quarter = 60 / tempo;
  if (denominator === 8) return beats * (quarter / 2);
  return beats * quarter;
}

function buildChord(rootMidi, quality) {
  const intervals = quality === 'min' ? [0, 3, 7] : quality === 'dim' ? [0, 3, 6] : [0, 4, 7];
  return intervals.map((i) => rootMidi + i);
}

function degreeRoot(key, mode, symbol) {
  const baseScale = mode === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const info = DEGREE_MAP[symbol] || DEGREE_MAP.I;
  const tonic = NOTE_INDEX[key] ?? 0;
  return tonic + baseScale[info.degree] + (info.shift || 0);
}

function progressionFromBuilder(builder) {
  const progression = (builder.progression || 'I V vi IV').trim().split(/\s+/).filter(Boolean);
  const { numerator } = parseSignature(builder.signature || '4/4');
  const chords = progression.map((symbol) => {
    const info = DEGREE_MAP[symbol] || (builder.mode === 'minor' ? DEGREE_MAP.i : DEGREE_MAP.I);
    const rootPc = degreeRoot(builder.key || 'C', builder.mode || 'major', symbol);
    const rootMidi = noteNameToMidi(CHROMATIC[(rootPc + 12) % 12], 3);
    return {
      name: symbol,
      beats: numerator,
      notes: buildChord(rootMidi, info.quality),
    };
  });
  return {
    type: 'chord_progression',
    chords,
    tempo: Number(builder.tempo || 88),
    loopable: builder.loop,
    click: builder.click,
    signature: builder.signature || '4/4',
  };
}

function scheduleSequence(state, start, track) {
  let t = start;
  const beatSec = 60 / state.tempo;
  (track.notes || []).forEach((note) => {
    const d = Math.max(0.08, (note.duration || 0.5) * beatSec);
    createVoice(state.ctx, state.master, { frequency: midiToFrequency(noteToMidi(note.note || 'C4')), startTime: t, duration: d, type: 'triangle', gain: 0.06 });
    t += d + 0.01;
  });
  return t;
}

function scheduleDrone(state, start, track) {
  const duration = beatsToSeconds(track.durationBeats || 8, state.tempo, track.signature || '4/4');
  const notes = track.notes?.length ? track.notes.map(noteToMidi) : [noteToMidi(track.root || 'C3'), noteToMidi(track.root || 'C3') + 12];
  notes.forEach((midi, idx) => createVoice(state.ctx, state.master, { frequency: midiToFrequency(midi), startTime: start, duration, type: idx === 0 ? 'sine' : 'triangle', gain: idx === 0 ? 0.05 : 0.025, filterHz: 1800 }));
  return start + duration;
}

function schedulePulse(state, start, track, clickOnly = false) {
  const { numerator } = parseSignature(track.signature || '4/4');
  const durationBeats = track.durationBeats || numerator * 2;
  let t = start;
  for (let i = 0; i < durationBeats; i += 1) {
    const accent = i % numerator === 0;
    createVoice(state.ctx, state.master, { frequency: accent ? 1200 : 900, startTime: t, duration: 0.045, type: 'square', gain: clickOnly ? (accent ? 0.02 : 0.012) : (accent ? 0.012 : 0.007), filterHz: 3600 });
    t += beatsToSeconds(1, state.tempo, track.signature || '4/4');
  }
  return t;
}

function scheduleProgression(state, start, track) {
  let t = start;
  const click = track.click !== false;
  const signature = track.signature || '4/4';
  track.chords.forEach((chord) => {
    const duration = beatsToSeconds(chord.beats || 4, state.tempo, signature);
    chord.notes.forEach((note, idx) => {
      const midi = typeof note === 'number' ? note : noteToMidi(note);
      createVoice(state.ctx, state.master, { frequency: midiToFrequency(midi), startTime: t, duration, type: idx === 0 ? 'triangle' : 'sine', gain: idx === 0 ? 0.05 : 0.03, filterHz: 1750 });
    });
    if (click) {
      let ct = t;
      for (let beat = 0; beat < (chord.beats || 4); beat += 1) {
        const accent = beat === 0;
        createVoice(state.ctx, state.master, { frequency: accent ? 1250 : 920, startTime: ct, duration: 0.045, type: 'square', gain: accent ? 0.015 : 0.009, filterHz: 3800 });
        ct += beatsToSeconds(1, state.tempo, signature);
      }
    }
    t += duration;
  });
  return t;
}

function scheduleTrack(state, start, track) {
  switch (track.type) {
    case 'drone': return scheduleDrone(state, start, track);
    case 'pulse_loop': return schedulePulse(state, start, track);
    case 'chord_progression': return scheduleProgression(state, start, track);
    default: return scheduleSequence(state, start, track);
  }
}

function updateButtonState(card, playing) {
  card.classList.toggle('is-playing', playing);
  const button = card.querySelector('.player-button');
  if (button) button.textContent = playing ? 'Arrêter' : 'Lecture';
}

function animateProgress(card, state) {
  const fill = card.querySelector('.player-progress-fill');
  if (!fill) return;
  const loop = () => {
    if (!activePlayer || activePlayer.state !== state) {
      fill.style.width = '0%';
      return;
    }
    const ratio = ((state.ctx.currentTime - state.cycleStart) / Math.max(0.001, state.cycleDuration)) % 1;
    fill.style.width = `${Math.round(ratio * 100)}%`;
    state.rafId = requestAnimationFrame(loop);
  };
  state.rafId = requestAnimationFrame(loop);
}

function buildBuilderTrack(card) {
  const preset = card.querySelector('[data-builder-preset]')?.value || 'I V vi IV';
  const progressionInput = card.querySelector('[data-builder-progression]');
  if (preset !== 'custom' && progressionInput) progressionInput.value = preset;
  return progressionFromBuilder({
    progression: progressionInput?.value || preset,
    key: card.querySelector('[data-builder-key]')?.value || 'C',
    mode: card.querySelector('[data-builder-mode]')?.value || 'major',
    signature: card.querySelector('[data-builder-signature]')?.value || '4/4',
    tempo: card.querySelector('[data-player-tempo]')?.value || 88,
    loop: card.querySelector('[data-player-loop]')?.checked ?? true,
    click: card.querySelector('[data-player-click]')?.checked ?? true,
  });
}

async function ensureRunning() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}

export function stopAllPlayers(root = document) {
  if (activePlayer) {
    activePlayer.cancelled = true;
    if (activePlayer.timer) clearInterval(activePlayer.timer);
    if (activePlayer.state?.rafId) cancelAnimationFrame(activePlayer.state.rafId);
  }
  activePlayer = null;
  root.querySelectorAll('.audio-card, .builder-card').forEach((card) => card.classList.remove('is-playing'));
  root.querySelectorAll('.player-button').forEach((button) => { button.textContent = 'Lecture'; });
  root.querySelectorAll('.player-progress-fill').forEach((fill) => { fill.style.width = '0%'; });
}

async function playTrack(card, track) {
  stopAllPlayers(card.closest('.modal-dialog') || document);
  const ctx = await ensureRunning();
  const tempo = Number(card.querySelector('[data-player-tempo]')?.value || track.tempo || 88);
  const loop = card.querySelector('[data-player-loop]')?.checked ?? !!track.loopable;
  const click = card.querySelector('[data-player-click]')?.checked;
  const actualTrack = track.type === 'builder' ? buildBuilderTrack(card) : { ...track, tempo, click: click ?? track.click };
  actualTrack.tempo = tempo;
  const state = { ctx, master: ensureMaster(ctx), tempo, cycleStart: ctx.currentTime + 0.06, cycleDuration: 0.1, rafId: null };
  updateButtonState(card, true);
  const leadTime = 0.12;
  let nextCycle = ctx.currentTime + leadTime;
  activePlayer = { cancelled: false, state, timer: null };
  const playCycle = () => {
    state.cycleStart = nextCycle;
    const end = scheduleTrack(state, nextCycle, actualTrack);
    state.cycleDuration = Math.max(0.1, end - nextCycle);
    nextCycle = end;
    if (!loop) {
      setTimeout(() => {
        if (activePlayer?.state === state) stopAllPlayers(card.closest('.modal-dialog') || document);
      }, state.cycleDuration * 1000 + 100);
    }
  };
  playCycle();
  animateProgress(card, state);
  if (loop) {
    activePlayer.timer = setInterval(() => {
      if (ctx.currentTime + 0.35 >= nextCycle) playCycle();
    }, 90);
  }
}

export function attachAudioPlayers(root = document) {
  root.querySelectorAll('.audio-card, .builder-card').forEach((card) => {
    const slider = card.querySelector('[data-player-tempo]');
    const readout = card.querySelector('.tempo-readout');
    if (slider && readout && slider.dataset.boundTempo !== 'true') {
      const sync = () => { readout.textContent = `${slider.value} BPM`; };
      sync();
      slider.dataset.boundTempo = 'true';
      slider.addEventListener('input', sync);
    }

    const preset = card.querySelector('[data-builder-preset]');
    const progression = card.querySelector('[data-builder-progression]');
    if (preset && progression && preset.dataset.boundPreset !== 'true') {
      preset.dataset.boundPreset = 'true';
      preset.addEventListener('change', () => {
        if (preset.value !== 'custom') progression.value = preset.value;
      });
    }

    card.querySelectorAll('[data-stop-player]').forEach((btn) => {
      if (btn.dataset.boundStop === 'true') return;
      btn.dataset.boundStop = 'true';
      btn.addEventListener('click', () => stopAllPlayers(root));
    });

    const button = card.querySelector('.player-button');
    if (!button || button.dataset.boundPlayer === 'true') return;
    button.dataset.boundPlayer = 'true';
    button.addEventListener('click', async () => {
      if (activePlayer && card.classList.contains('is-playing')) {
        stopAllPlayers(root);
        return;
      }
      const kind = button.dataset.playerKind || 'sequence';
      const payload = button.dataset.playerPayload ? JSON.parse(button.dataset.playerPayload) : { type: kind };
      const track = kind === 'builder' ? { type: 'builder' } : { ...payload, type: kind };
      await playTrack(card, track);
    });
  });
}
