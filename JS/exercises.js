import { normalizeText, shuffle, escapeHtml } from './utils.js';
import { playSequence, describeSequence } from './audioEngine.js';

/**
 * Moteur d'exercices auto-corrigés.
 *
 * Types pris en charge :
 * - single_choice
 * - multiple_choice
 * - true_false
 * - short_text
 * - match_pairs
 * - order_steps
 *
 * Exemple d'adaptation :
 * le moteur reste réutilisable pour un domaine technique, juridique,
 * managérial ou musical tant que les données respectent la même structure.
 */

export function pickExercisePool(lessons, state) {
  const scopedLessons = state.learningMode === 'pathway' && state.selectedPathway
    ? lessons.filter((lesson) => lesson.pathways?.some((path) => path.id === state.selectedPathway))
    : lessons;

  return shuffle(scopedLessons.flatMap((lesson) =>
    lesson.exercises.map((exercise) => ({
      ...exercise,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      audioPrompt: exercise.audioPrompt || lesson.listeningExamples?.[0] || null,
    })),
  ));
}

export function renderExercise(exercise, mountNode, options = {}) {
  mountNode.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <p class="section-meta">Capsule source : ${escapeHtml(exercise.lessonTitle || '')}</p>
    <h3>${escapeHtml(exercise.prompt)}</h3>
    <p>${escapeHtml(exercise.instructions || '')}</p>
  `;

  if (exercise.audioPrompt?.notes?.length) {
    wrapper.appendChild(buildAudioPrompt(exercise.audioPrompt));
  }

  const form = document.createElement('form');
  form.dataset.exerciseType = exercise.type;
  form.dataset.exerciseId = exercise.id;

  switch (exercise.type) {
    case 'single_choice':
    case 'true_false':
      renderChoiceInputs(exercise, form, false);
      break;
    case 'multiple_choice':
      renderChoiceInputs(exercise, form, true);
      break;
    case 'short_text':
      form.innerHTML += `
        <input class="text-answer" name="shortTextAnswer" type="text" placeholder="Saisissez votre réponse" />
      `;
      break;
    case 'match_pairs':
      renderMatchPairs(exercise, form);
      break;
    case 'order_steps':
      renderOrderSteps(exercise, form);
      break;
    default:
      form.innerHTML += '<p>Type d\'exercice non reconnu.</p>';
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'exercise-toolbar';
  toolbar.innerHTML = '<button type="submit">Corriger</button>';
  form.appendChild(toolbar);

  const feedback = document.createElement('div');
  feedback.id = `exerciseFeedback-${exercise.id}`;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = evaluateExercise(exercise, new FormData(form));
    feedback.className = `feedback-box ${result.correct ? 'success' : 'error'}`;
    feedback.innerHTML = `<strong>${result.correct ? 'Réponse correcte' : 'Réponse à revoir'}</strong><p>${escapeHtml(result.feedback)}</p>`;
    form.dataset.lastResult = result.correct ? 'success' : 'error';
    if (typeof options.onAfterSubmit === 'function') options.onAfterSubmit(result);
  });

  mountNode.append(wrapper, form, feedback);
}

function buildAudioPrompt(example) {
  const card = document.createElement('div');
  card.className = 'audio-card';
  card.innerHTML = `
    <h4>${escapeHtml(example.title || 'Exemple sonore')}</h4>
    <p>${escapeHtml(example.caption || 'Écoutez puis jouez la proposition sur votre instrument.')}</p>
    <p class="audio-note">${escapeHtml(describeSequence(example.notes || []))} — tempo ${example.tempo || 92}</p>
  `;
  const toolbar = document.createElement('div');
  toolbar.className = 'audio-toolbar';
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.textContent = 'Lire l’exemple';
  playBtn.addEventListener('click', () => playSequence(example.notes || [], { tempo: example.tempo, instrument: example.instrument }));
  toolbar.appendChild(playBtn);
  card.appendChild(toolbar);
  return card;
}

function renderChoiceInputs(exercise, form, multiple) {
  const container = document.createElement('div');
  container.className = 'exercise-options';

  const options = shuffle(exercise.options || []);
  options.forEach((option, index) => {
    const name = multiple ? 'multiAnswer' : 'singleAnswer';
    const type = multiple ? 'checkbox' : 'radio';
    const item = document.createElement('label');
    item.className = 'exercise-option';
    item.innerHTML = `
      <input type="${type}" name="${name}" value="${escapeHtml(option.value)}" ${index === 0 && !multiple ? 'required' : ''} />
      <span>${escapeHtml(option.label)}</span>
    `;
    container.appendChild(item);
  });

  form.appendChild(container);
}

function renderMatchPairs(exercise, form) {
  const grid = document.createElement('div');
  grid.className = 'matching-grid';

  const leftCol = document.createElement('div');
  const rightCol = document.createElement('div');

  leftCol.innerHTML = '<h4>Éléments à relier</h4>';
  rightCol.innerHTML = '<h4>Choisissez la bonne correspondance</h4>';

  const rightOptions = shuffle(exercise.pairs.map((pair) => pair.right));

  exercise.pairs.forEach((pair, index) => {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.textContent = pair.left;

    const selectWrap = document.createElement('div');
    selectWrap.className = 'match-card';
    const select = document.createElement('select');
    select.name = `match_${index}`;
    select.required = true;
    select.innerHTML = `<option value="">Sélectionner</option>${rightOptions
      .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
      .join('')}`;
    selectWrap.appendChild(select);

    leftCol.appendChild(card);
    rightCol.appendChild(selectWrap);
  });

  grid.append(leftCol, rightCol);
  form.appendChild(grid);
}

function renderOrderSteps(exercise, form) {
  const shuffled = shuffle(exercise.steps.map((step) => ({ ...step })));
  const list = document.createElement('ol');
  list.className = 'order-list';

  shuffled.forEach((step) => {
    const row = document.createElement('li');
    row.className = 'order-row';
    row.innerHTML = `
      <span>${escapeHtml(step.label)}</span>
      <select name="order_${escapeHtml(step.id)}" required>
        <option value="">Position</option>
        ${exercise.steps.map((_, idx) => `<option value="${idx + 1}">${idx + 1}</option>`).join('')}
      </select>
    `;
    list.appendChild(row);
  });

  form.appendChild(list);
}

export function evaluateExercise(exercise, formData) {
  switch (exercise.type) {
    case 'single_choice':
    case 'true_false':
      return evaluateSingleChoice(exercise, formData);
    case 'multiple_choice':
      return evaluateMultipleChoice(exercise, formData);
    case 'short_text':
      return evaluateShortText(exercise, formData);
    case 'match_pairs':
      return evaluateMatchPairs(exercise, formData);
    case 'order_steps':
      return evaluateOrderSteps(exercise, formData);
    default:
      return { correct: false, feedback: 'Type non géré.' };
  }
}

function evaluateSingleChoice(exercise, formData) {
  const answer = formData.get('singleAnswer');
  const correct = answer === exercise.correct;
  return { correct, feedback: correct ? exercise.feedbackCorrect : exercise.feedbackIncorrect };
}

function evaluateMultipleChoice(exercise, formData) {
  const answers = formData.getAll('multiAnswer').sort();
  const expected = [...exercise.correct].sort();
  const correct = JSON.stringify(answers) === JSON.stringify(expected);
  return { correct, feedback: correct ? exercise.feedbackCorrect : exercise.feedbackIncorrect };
}

function evaluateShortText(exercise, formData) {
  const answer = normalizeText(formData.get('shortTextAnswer') || '');
  const accepted = (exercise.acceptedAnswers || []).map(normalizeText);
  const correct = accepted.includes(answer);
  return { correct, feedback: correct ? exercise.feedbackCorrect : exercise.feedbackIncorrect };
}

function evaluateMatchPairs(exercise, formData) {
  const correct = exercise.pairs.every((pair, index) => formData.get(`match_${index}`) === pair.right);
  return { correct, feedback: correct ? exercise.feedbackCorrect : exercise.feedbackIncorrect };
}

function evaluateOrderSteps(exercise, formData) {
  const correct = exercise.steps.every((step, index) => Number(formData.get(`order_${step.id}`)) === index + 1);
  return { correct, feedback: correct ? exercise.feedbackCorrect : exercise.feedbackIncorrect };
}
