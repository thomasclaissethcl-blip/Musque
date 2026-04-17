export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function shuffle(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

export function normalizeText(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function uniqueById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function formatStage(stage) {
  const labels = {
    decouverte: 'Découverte',
    apprentissage: 'Apprentissage',
    approfondissement: 'Approfondissement',
    maitrise: 'Maîtrise',
    virtuosite: 'Virtuosité',
  };
  return labels[stage] || stage;
}