
import { formatStage } from './utils.js';
import { renderExercise } from './exercises.js';
import { attachAudioPlayers, stopAllPlayers } from './midiEngine.js';

export function renderPathways(pathways, state, mountNode, onSelect) {
  mountNode.innerHTML = '';
  pathways.forEach((pathway) => {
    const isActive = state.selectedPathway === pathway.id;
    const progress = state.pathwayProgress[pathway.id] || { completedLessonIds: [] };
    const card = document.createElement('article');
    card.className = `pathway-card compact ${isActive ? 'active-card' : ''}`;
    card.innerHTML = `
      <div>
        <p class="section-meta">${progress.completedLessonIds.length} / ${pathway.lessonCount || '?'} ateliers</p>
        <h3>${pathway.title}</h3>
      </div>
      <button class="${isActive ? '' : 'secondary-btn'}">${isActive ? 'Actif' : 'Choisir'}</button>
    `;
    card.querySelector('button').addEventListener('click', () => onSelect(pathway.id));
    mountNode.appendChild(card);
  });
}

export function renderPathwayShowcase(pathways, state, mountNode, onSelect) {
  mountNode.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'showcase-grid';
  pathways.forEach((pathway) => {
    const isActive = pathway.id === state.selectedPathway;
    const progress = state.pathwayProgress[pathway.id] || { completedLessonIds: [] };
    const card = document.createElement('article');
    card.className = `showcase-card accent-${pathway.accent || 'copper'} ${isActive ? 'active-card' : ''}`;
    card.innerHTML = `
      <p class="eyebrow">Parcours</p>
      <h3>${pathway.title}</h3>
      <p>${pathway.description}</p>
      <div class="showcase-meta">
        <span class="pill">${progress.completedLessonIds.length} / ${pathway.lessonCount || '?'} ateliers</span>
        <span class="pill muted">${pathway.hero || 'Travail progressif.'}</span>
      </div>
      <button>${isActive ? 'Parcours actif' : 'Activer ce parcours'}</button>
    `;
    card.querySelector('button').addEventListener('click', () => onSelect(pathway.id));
    grid.appendChild(card);
  });
  mountNode.appendChild(grid);
}

export function renderContinueCard(lesson, pathways, mountNode) {
  const pathInfo = lesson.pathways?.[0];
  const pathTitle = pathways.find((item) => item.id === pathInfo?.id)?.title || 'Atelier';
  mountNode.innerHTML = `
    <article class="continue-card-inner">
      <p class="section-meta">${pathTitle} · ${formatStage(pathInfo?.stage || 'decouverte')}</p>
      <h3>${lesson.title}</h3>
      <p>${lesson.description}</p>
      <div class="continue-grid compact-grid">
        <div class="focus-chip"><strong>À jouer</strong><span>${lesson.practice?.duration || '6 à 10 min'}</span></div>
        <div class="focus-chip"><strong>À entendre</strong><span>${(lesson.supportTracks || []).length + (lesson.examples || []).length} support(s)</span></div>
        <div class="focus-chip"><strong>À comprendre</strong><span>${(lesson.explanations || []).length} repères</span></div>
      </div>
      <footer>
        <button data-open-lesson="${lesson.id}">Ouvrir la séance</button>
      </footer>
    </article>
  `;
}

export function renderLessonList(lessons, state, mountNode, onOpen) {
  mountNode.innerHTML = '';
  if (!lessons.length) {
    mountNode.innerHTML = '<p class="small-text">Aucun atelier ne correspond à la recherche ou au filtre courant.</p>';
    return;
  }
  lessons.forEach((lesson) => {
    const pathwayInfo = lesson.pathways?.find((item) => item.id === state.selectedPathway) || lesson.pathways?.[0];
    const completed = state.profile.completedLessons.includes(lesson.id);
    const locked = lesson.locked;
    const card = document.createElement('article');
    card.className = `lesson-card ${completed ? 'completed-card' : ''} ${locked ? 'locked-card' : ''}`;
    card.innerHTML = `
      <div class="lesson-card-topline">
        <span class="pill ${completed ? 'success' : locked ? 'locked' : ''}">${completed ? 'Validé' : locked ? 'Verrouillé' : formatStage(pathwayInfo?.stage || 'decouverte')}</span>
        <span class="pill muted">${lesson.typeLabel || 'Atelier'}</span>
      </div>
      <h3>${lesson.title}</h3>
      <p>${lesson.description}</p>
      <div class="continue-grid compact-grid">
        <div class="focus-chip"><strong>Durée</strong><span>${lesson.practice?.duration || '6 à 10 min'}</span></div>
        <div class="focus-chip"><strong>Supports</strong><span>${(lesson.examples || []).length + (lesson.supportTracks || []).length}</span></div>
      </div>
      <footer>
        <button class="${locked ? 'secondary-btn' : ''}" ${locked ? 'disabled' : ''}>${locked ? 'Indisponible' : 'Ouvrir l’atelier'}</button>
      </footer>
    `;
    if (!locked) card.querySelector('button').addEventListener('click', () => onOpen(lesson.id));
    mountNode.appendChild(card);
  });
}

export function renderLessonDetail(lesson, mountNode, state, pathways) {
  stopAllPlayers();
  const pathwayInfo = lesson.pathways?.find((path) => path.id === state.selectedPathway) || lesson.pathways?.[0];
  const pathTitle = pathways.find((pathway) => pathway.id === pathwayInfo?.id)?.title || 'Atelier';
  const completed = state.profile.completedLessons.includes(lesson.id);
  mountNode.innerHTML = `
    <div class="lesson-player-head">
      <div>
        <p class="meta">${pathTitle} · ${formatStage(pathwayInfo?.stage || 'decouverte')}</p>
        <h2>${lesson.title}</h2>
        <p class="microcopy">${lesson.description}</p>
      </div>
      <div class="head-actions">
        <button class="secondary-btn" data-close-workshop>Retour à l’exploration</button>
        <button data-complete-workshop>${completed ? 'Séance déjà validée' : 'Terminer la séance'}</button>
      </div>
    </div>

    <section class="session-layout">
      <article class="lesson-block action-block dominant-block">
        <p class="eyebrow">Intention</p>
        <h3>${lesson.sessionIntent || lesson.objective}</h3>
        <p>${lesson.context}</p>
        <div class="practice-ribbon">
          <span class="pill">Durée : ${lesson.practice?.duration || '6 à 10 min'}</span>
          <span class="pill muted">Commencez par jouer sur votre instrument</span>
        </div>
      </article>

      <article class="lesson-block practice-block">
        <div class="section-head"><h3>À jouer</h3><span class="section-meta">Zone dominante</span></div>
        <p>${lesson.practice?.setup || ''}</p>
        <ol class="practice-steps">${(lesson.practice?.steps || []).map((step) => `<li>${step}</li>`).join('')}</ol>
        <div class="checklist-box">
          <h4>Vérifier pendant la séance</h4>
          <ul>${(lesson.practiceChecklist || []).map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      </article>

      <article class="lesson-block audio-lab-block">
        <div class="section-head"><h3>Écouter et jouer avec un support</h3><button class="secondary-btn small-btn" data-stop-all-audio>Tout arrêter</button></div>
        <p class="microcopy">Vous pouvez ici écouter un motif, installer un drone harmonique, pratiquer sur une suite d’accords ou maintenir une pulsation régulière. Chaque support se règle sans quitter la séance.</p>
        <div class="audio-grid">
          ${(lesson.examples || []).map((example) => audioCard(example, 'sequence')).join('')}
          ${(lesson.supportTracks || []).map((item) => audioCard(item, item.type)).join('')}
        </div>
      </article>

      <article class="lesson-block variation-block">
        <div class="section-head"><h3>Variation / exploration</h3><span class="section-meta">Ouvrir sans se disperser</span></div>
        <p>${lesson.variationPrompt || 'Gardez le même matériau et modifiez un seul paramètre à la fois.'}</p>
        <div class="coach-box"><strong>Conseil d’écoute</strong><p>${lesson.coachTip || ''}</p></div>
      </article>

      <article id="understandSection" class="lesson-block understand-block collapsed">
        <div class="section-head"><h3>Comprendre</h3><button class="secondary-btn small-btn" data-toggle-understand>Déplier comprendre</button></div>
        <div class="understand-content">
          <div class="keypoint-list">${(lesson.keyPoints || []).map((point) => `<div class="keypoint-item"><strong>${point.front}</strong><p>${point.back}</p></div>`).join('')}</div>
          ${(lesson.explanations || []).map((block) => `<div class="explanation-card"><h4>${block.title}</h4><p>${block.text}</p></div>`).join('')}
        </div>
      </article>

      <article class="lesson-block reflection-block">
        <div class="section-head"><h3>Repère personnel</h3><span class="section-meta">Ancrage réflexif</span></div>
        <p>${lesson.reflection?.question || ''}</p>
        <div class="suggestion-row">${(lesson.reflection?.suggestions || []).map((item) => `<span class="pill muted">${item}</span>`).join('')}</div>
      </article>

      <article class="lesson-block exercise-block">
        <div class="section-head"><h3>Test rapide après pratique</h3><span class="section-meta">Correction automatique</span></div>
        <p>Répondez après avoir réellement joué l’atelier. Le test aide à verbaliser ce que vous venez d’entendre et de faire.</p>
        <div class="inline-exercises"></div>
      </article>
    </section>
  `;

  mountNode.querySelector('[data-stop-all-audio]')?.addEventListener('click', () => stopAllPlayers(mountNode));
  const exerciseContainer = mountNode.querySelector('.inline-exercises');
  (lesson.exercises || []).forEach((exercise) => {
    const card = document.createElement('div');
    card.className = 'exercise-mini-card';
    renderExercise({ ...exercise, lessonTitle: lesson.title }, card);
    exerciseContainer.appendChild(card);
  });
  attachAudioPlayers(mountNode);
}

function audioCard(item, kind) {
  const payload = JSON.stringify(item).replace(/"/g, '&quot;');
  return `
    <div class="audio-card">
      <p class="section-meta">${audioKindLabel(kind)}</p>
      <h4>${item.title}</h4>
      <p>${item.description || ''}</p>
      <div class="player-controls">
        <label>Tempo <input type="range" min="45" max="160" value="${item.tempo || 90}" data-player-tempo /></label>
        <span class="tempo-readout">${item.tempo || 90} BPM</span>
      </div>
      <div class="player-progress"><div class="player-progress-fill"></div></div>
      <div class="player-actions">
        <button class="player-button" data-player-kind="${kind}" data-player-payload="${payload}">Lecture</button>
        <label class="loop-toggle"><input type="checkbox" data-player-loop ${item.loopable ? 'checked' : ''}/> Boucle</label>
      </div>
    </div>
  `;
}

function audioKindLabel(kind) {
  const labels = {
    sequence: 'Exemple',
    drone: 'Drone d’accord',
    chord_progression: 'Suite d’accords',
    pulse_loop: 'Boucle de pulsation',
  };
  return labels[kind] || 'Support';
}

export function updateStageInfo(state, lessons, stageLabelEl, stageDescriptionEl) {
  if (state.learningMode !== 'pathway' || !state.selectedPathway) {
    stageLabelEl.textContent = 'Exploration libre';
    stageDescriptionEl.textContent = 'Vous choisissez directement les ateliers sans ordre imposé.';
    return;
  }
  const scoped = lessons.filter((lesson) => lesson.pathways?.some((p) => p.id === state.selectedPathway));
  const nextLesson = scoped.find((lesson) => !lesson.locked && !lesson.completed);
  const stage = nextLesson?.currentStage || 'decouverte';
  stageLabelEl.textContent = formatStage(stage);
  stageDescriptionEl.textContent = 'Le parcours organise la difficulté, mais chaque atelier reste une micro-séance autonome à réaliser chez soi.';
}
