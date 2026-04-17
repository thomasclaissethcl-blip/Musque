import { formatStage } from './utils.js';
import { renderExercise } from './exercises.js';
import { attachSequencePlayers } from './midiEngine.js';

/**
 * Fonctions d'affichage.
 *
 * Dans ce POC, l'affichage a été enrichi pour montrer un produit presque fini :
 * - consigne de pratique à réaliser sur l'instrument ;
 * - lecteur de séquences ;
 * - exercices visibles aussi directement dans la capsule.
 */
export function renderPathways(pathways, state, mountNode, onSelect) {
  mountNode.innerHTML = '';
  pathways.forEach((pathway) => {
    const isActive = state.selectedPathway === pathway.id;
    const progress = state.pathwayProgress[pathway.id] || { completedLessonIds: [] };
    const card = document.createElement('article');
    card.className = `pathway-card ${isActive ? 'active-card' : ''}`;
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
    context.innerHTML = `<h3>Situation de travail</h3><p>${lesson.context}</p>`;
    mountNode.appendChild(context);
  }

  if (lesson.practice) {
    const practice = document.createElement('div');
    practice.className = 'lesson-block';
    practice.innerHTML = `
      <h3>Pratique instrumentale</h3>
      <p><strong>Durée conseillée :</strong> ${lesson.practice.duration}</p>
      <p>${lesson.practice.setup}</p>
      <ol>${lesson.practice.steps.map((step) => `<li>${step}</li>`).join('')}</ol>
      <p><strong>Auto-vérification :</strong> ${lesson.practice.selfCheck}</p>
    `;
    mountNode.appendChild(practice);
  }

  if (lesson.examples?.length) {
    const examples = document.createElement('div');
    examples.className = 'lesson-block';
    examples.innerHTML = '<h3>Exemples jouables</h3>';
    const grid = document.createElement('div');
    grid.className = 'example-grid';
    lesson.examples.forEach((example) => {
      const card = document.createElement('div');
      card.className = 'example-card';
      const payload = JSON.stringify(example).replace(/"/g, '&quot;');
      card.innerHTML = `
        <h4>${example.title}</h4>
        <p>${example.description}</p>
        <p class="microcopy">Tempo : ${example.tempo} BPM · Notes : ${(example.notes || []).map((n) => n.note).join(' · ')}</p>
        <button class="player-button" data-sequence-json="${payload}">Jouer l’exemple</button>
      `;
      grid.appendChild(card);
    });
    examples.appendChild(grid);
    mountNode.appendChild(examples);
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

  const inlineExercises = document.createElement('div');
  inlineExercises.className = 'lesson-block';
  inlineExercises.innerHTML = `
    <h3>Exercices de la capsule</h3>
    <p>Après avoir joué la consigne sur votre instrument, utilisez ces exercices pour verbaliser ce que vous venez de travailler. Ils sont aussi mobilisables dans le mode « Exercice rapide ».</p>
  `;
  const container = document.createElement('div');
  container.className = 'inline-exercises';
  lesson.exercises.forEach((exercise) => {
    const card = document.createElement('div');
    card.className = 'exercise-mini-card';
    renderExercise({ ...exercise, lessonTitle: lesson.title }, card);
    container.appendChild(card);
  });
  inlineExercises.appendChild(container);
  mountNode.appendChild(inlineExercises);

  attachSequencePlayers(mountNode);
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
  stageDescriptionEl.textContent = 'En parcours guidé, les ateliers se débloquent dans l’ordre prévu pour la montée en compétence.';
}