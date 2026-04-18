import { formatStage } from './utils.js';

/**
 * Fonctions d'affichage.
 *
 * Elles restent séparées de la logique métier pour simplifier l'adaptation :
 * vous pouvez refaire l'interface sans toucher au calcul de progression ni au moteur d'exercices.
 */
export function renderPathways(pathways, state, mountNode, onSelect) {
  mountNode.innerHTML = '';
  pathways.forEach((pathway) => {
    const isActive = state.selectedPathway === pathway.id;
    const progress = state.pathwayProgress[pathway.id] || { completedLessonIds: [] };
    const card = document.createElement('article');
    card.className = 'pathway-card';
    card.innerHTML = `
      <h3>${pathway.title}</h3>
      <p>${pathway.description}</p>
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
      <span class="pill ${completed ? 'success' : locked ? 'locked' : ''}">${completed ? 'Validée' : locked ? 'Verrouillée' : lesson.typeLabel || lesson.type}</span>
      <h3>${lesson.title}</h3>
      <p>${lesson.description}</p>
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
  intro.innerHTML = `<h3>Objectif</h3><p>${lesson.objective}</p>`;
  mountNode.appendChild(intro);

  if (lesson.context) {
    const context = document.createElement('div');
    context.className = 'lesson-block';
    context.innerHTML = `<h3>Situation</h3><p>${lesson.context}</p>`;
    mountNode.appendChild(context);
  }

  const keyPoints = document.createElement('div');
  keyPoints.className = 'lesson-block';
  keyPoints.innerHTML = '<h3>Points clés</h3>';
  const keyList = document.createElement('div');
  keyList.className = 'keypoint-list';
  lesson.keyPoints.forEach((point) => {
    const item = document.createElement('div');
    item.className = 'keypoint-item';
    item.innerHTML = `<strong>${point.front}</strong><p>${point.back}</p>`;
    keyList.appendChild(item);
  });
  keyPoints.appendChild(keyList);
  mountNode.appendChild(keyPoints);

  lesson.explanations.forEach((block) => {
    const section = document.createElement('div');
    section.className = 'lesson-block';
    section.innerHTML = `<h3>${block.title}</h3><p>${block.text}</p>`;
    mountNode.appendChild(section);
  });

  const exerciseOverview = document.createElement('div');
  exerciseOverview.className = 'lesson-block';
  exerciseOverview.innerHTML = `
    <h3>Exercices proposés</h3>
    <p>Cette capsule contient ${lesson.exercises.length} exercice(s) auto-corrigé(s). Ils seront disponibles dans l'exercice rapide, et vous pouvez aussi prévoir un mode "évaluation de fin de capsule" si vous souhaitez l'ajouter.</p>
  `;
  mountNode.appendChild(exerciseOverview);
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
  stageDescriptionEl.textContent = 'En parcours guidé, les capsules se débloquent dans l’ordre prévu pour le domaine.';
}
