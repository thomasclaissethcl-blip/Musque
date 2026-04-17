import { formatStage, escapeHtml } from './utils.js';
import { playSequence, describeSequence } from './audioEngine.js';

/**
 * Fonctions d'affichage.
 *
 * Exemple d'adaptation :
 * pour un autre domaine, vous pouvez conserver ce découpage
 * et remplacer seulement certaines sections ou cartes spécialisées.
 */
export function renderPathways(pathways, state, mountNode, onSelect) {
  mountNode.innerHTML = '';
  pathways.forEach((pathway) => {
    const isActive = state.selectedPathway === pathway.id;
    const progress = state.pathwayProgress[pathway.id] || { completedLessonIds: [] };
    const card = document.createElement('article');
    card.className = `pathway-card ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <h3>${escapeHtml(pathway.title)}</h3>
      <p>${escapeHtml(pathway.description)}</p>
      <footer>
        <span class="pill">${progress.completedLessonIds.length} / ${pathway.lessonCount || '?'} validées</span>
        <button class="${isActive ? '' : 'secondary-btn'}">${isActive ? 'Actif' : 'Choisir'}</button>
      </footer>
    `;
    card.querySelector('button').addEventListener('click', () => onSelect(pathway.id));
    mountNode.appendChild(card);
  });
}

export function renderLessonList(lessons, state, mountNode, onOpen) {
  mountNode.innerHTML = '';

  lessons.forEach((lesson) => {
    const completed = state.profile.completedLessons.includes(lesson.id);
    const locked = lesson.locked;
    const card = document.createElement('article');
    card.className = 'lesson-card';
    card.innerHTML = `
      <span class="pill ${completed ? 'success' : locked ? 'locked' : 'stage'}">${completed ? 'Validée' : locked ? 'Verrouillée' : escapeHtml(lesson.typeLabel || lesson.type)}</span>
      <h3>${escapeHtml(lesson.title)}</h3>
      <p>${escapeHtml(lesson.description)}</p>
      <footer>
        <span class="section-meta">${lesson.exerciseCount} exercice(s)</span>
        <button class="${locked ? 'secondary-btn' : ''}" ${locked ? 'disabled' : ''}>${locked ? 'Indisponible' : 'Ouvrir'}</button>
      </footer>
    `;
    if (!locked) card.querySelector('button').addEventListener('click', () => onOpen(lesson.id));
    mountNode.appendChild(card);
  });
}

export function renderLessonDetail(lesson, mountNode) {
  mountNode.innerHTML = '';

  const intro = document.createElement('div');
  intro.className = 'lesson-block';
  intro.innerHTML = `<h3>Objectif</h3><p>${escapeHtml(lesson.objective)}</p>`;
  mountNode.appendChild(intro);

  if (lesson.context) {
    const context = document.createElement('div');
    context.className = 'lesson-block';
    context.innerHTML = `<h3>Cadre de travail</h3><p>${escapeHtml(lesson.context)}</p>`;
    mountNode.appendChild(context);
  }

  if (lesson.practiceTask) {
    const practice = document.createElement('div');
    practice.className = 'lesson-block';
    practice.innerHTML = `
      <h3>${escapeHtml(lesson.practiceTask.title || 'Mise en pratique')}</h3>
      <div class="practice-card">
        <p>${escapeHtml(lesson.practiceTask.instructions || '')}</p>
        <footer class="note-footer">${escapeHtml(lesson.practiceTask.successHint || '')}</footer>
      </div>
    `;
    mountNode.appendChild(practice);
  }

  const keyPoints = document.createElement('div');
  keyPoints.className = 'lesson-block';
  keyPoints.innerHTML = '<h3>Points clés</h3>';
  const keyList = document.createElement('div');
  keyList.className = 'keypoint-list';
  lesson.keyPoints.forEach((point) => {
    const item = document.createElement('div');
    item.className = 'keypoint-item';
    item.innerHTML = `<strong>${escapeHtml(point.front)}</strong><p>${escapeHtml(point.back)}</p>`;
    keyList.appendChild(item);
  });
  keyPoints.appendChild(keyList);
  mountNode.appendChild(keyPoints);

  if (lesson.listeningExamples?.length) {
    const audioSection = document.createElement('div');
    audioSection.className = 'lesson-block';
    audioSection.innerHTML = '<h3>Exemples sonores</h3>';
    const grid = document.createElement('div');
    grid.className = 'listening-grid';

    lesson.listeningExamples.forEach((example) => {
      const card = document.createElement('article');
      card.className = 'audio-card';
      card.innerHTML = `
        <h4>${escapeHtml(example.title)}</h4>
        <p>${escapeHtml(example.caption || '')}</p>
        <p class="audio-note">${escapeHtml(describeSequence(example.notes || []))} — tempo ${example.tempo || 92}</p>
      `;
      const toolbar = document.createElement('div');
      toolbar.className = 'audio-toolbar';
      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.textContent = 'Lire';
      playBtn.addEventListener('click', () => playSequence(example.notes || [], { tempo: example.tempo, instrument: example.instrument }));
      toolbar.appendChild(playBtn);
      card.appendChild(toolbar);
      grid.appendChild(card);
    });

    audioSection.appendChild(grid);
    mountNode.appendChild(audioSection);
  }

  lesson.explanations.forEach((block) => {
    const section = document.createElement('div');
    section.className = 'lesson-block';
    section.innerHTML = `<h3>${escapeHtml(block.title)}</h3><p>${escapeHtml(block.text)}</p>`;
    mountNode.appendChild(section);
  });

  const exerciseArea = document.createElement('div');
  exerciseArea.className = 'lesson-block';
  exerciseArea.innerHTML = '<h3>Exercices de la capsule</h3><div id="inlineExerciseList" class="inline-exercise-list"></div>';
  mountNode.appendChild(exerciseArea);
  return exerciseArea.querySelector('#inlineExerciseList');
}

export function updateStageInfo(state, lessons, stageLabelEl, stageDescriptionEl) {
  if (state.learningMode !== 'pathway' || !state.selectedPathway) {
    stageLabelEl.textContent = 'Étape : libre';
    stageDescriptionEl.textContent = 'Toutes les capsules visibles sont accessibles sans progression contrainte.';
    return;
  }

  const scoped = lessons.filter((lesson) => lesson.pathways?.some((p) => p.id === state.selectedPathway));
  const nextLesson = scoped.find((lesson) => !lesson.locked && !lesson.completed);
  const stage = nextLesson?.currentStage || 'decouverte';
  stageLabelEl.textContent = `Étape : ${formatStage(stage)}`;
  stageDescriptionEl.textContent = 'En parcours guidé, les capsules se débloquent dans l’ordre prévu et les niveaux montent progressivement.';
}
