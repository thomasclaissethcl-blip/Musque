import { CONFIG } from './config.js';
import { loadData } from './dataService.js';
import { renderExercise, pickExercisePool } from './exercises.js';
import { renderLessonDetail, renderLessonList, renderPathways, updateStageInfo } from './renderers.js';
import { getDueReviewCards, scoreReviewCard, seedReviewCardsFromLesson } from './review.js';
import { awardXP, completeLesson, decorateLessons, hydratePathwayProgress, refreshDailyProgress } from './state.js';
import { exportState, importState, loadState, saveState, createDefaultState } from './storage.js';
import { clamp, uniqueById, formatStage } from './utils.js';

/**
 * Orchestrateur principal.
 *
 * Exemple d'adaptation :
 * - ce fichier peut rester presque inchangé pour un autre domaine
 * - le coeur du produit se trouve dans les JSON de contenus et dans le thème visuel
 */

let state = loadState();
let pathways = [];
let lessons = [];
let currentLesson = null;
let exercisePool = [];

const els = {
  xpValue: document.getElementById('xpValue'),
  levelValue: document.getElementById('levelValue'),
  streakValue: document.getElementById('streakValue'),
  levelProgressText: document.getElementById('levelProgressText'),
  levelProgressBar: document.getElementById('levelProgressBar'),
  freeModeBtn: document.getElementById('freeModeBtn'),
  pathModeBtn: document.getElementById('pathModeBtn'),
  modeBadge: document.getElementById('modeBadge'),
  pathBadge: document.getElementById('pathBadge'),
  heroTitle: document.getElementById('heroTitle'),
  heroText: document.getElementById('heroText'),
  searchInput: document.getElementById('searchInput'),
  pathwayList: document.getElementById('pathwayList'),
  lessonList: document.getElementById('lessonList'),
  lessonCatalogSection: document.getElementById('lessonCatalogSection'),
  lessonPlayer: document.getElementById('lessonPlayer'),
  lessonMeta: document.getElementById('lessonMeta'),
  lessonTitle: document.getElementById('lessonTitle'),
  lessonContent: document.getElementById('lessonContent'),
  closeLessonBtn: document.getElementById('closeLessonBtn'),
  completeLessonBtn: document.getElementById('completeLessonBtn'),
  currentStageLabel: document.getElementById('currentStageLabel'),
  currentStageDescription: document.getElementById('currentStageDescription'),
  reviewArea: document.getElementById('reviewArea'),
  quizArea: document.getElementById('quizArea'),
  startReviewBtn: document.getElementById('startReviewBtn'),
  startQuizBtn: document.getElementById('startQuizBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetBtn: document.getElementById('resetBtn'),
  lessonsTodayValue: document.getElementById('lessonsTodayValue'),
  reviewsTodayValue: document.getElementById('reviewsTodayValue'),
  quizTodayValue: document.getElementById('quizTodayValue'),
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const data = await loadData();
  pathways = data.pathways;
  lessons = data.lessons;

  if (!state.selectedPathway && pathways.length) {
    state.selectedPathway = pathways[0].id;
  }

  document.title = CONFIG.appTitle;
  hydratePathwayProgress(state, pathways);
  bindEvents();
  registerSW();
  refresh();
}

function bindEvents() {
  els.freeModeBtn.addEventListener('click', () => {
    state.learningMode = 'free';
    saveAndRefresh();
  });

  els.pathModeBtn.addEventListener('click', () => {
    state.learningMode = 'pathway';
    if (!state.selectedPathway && pathways.length) state.selectedPathway = pathways[0].id;
    saveAndRefresh();
  });

  els.searchInput.addEventListener('input', renderCatalog);
  els.closeLessonBtn.addEventListener('click', closeLesson);
  els.completeLessonBtn.addEventListener('click', validateCurrentLesson);
  els.startReviewBtn.addEventListener('click', startReviewSession);
  els.startQuizBtn.addEventListener('click', startQuickExercise);
  els.exportBtn.addEventListener('click', () => exportState(state));
  els.importInput.addEventListener('change', handleImport);
  els.resetBtn.addEventListener('click', () => {
    state = createDefaultState();
    hydratePathwayProgress(state, pathways);
    state.selectedPathway = pathways[0]?.id || null;
    saveAndRefresh();
  });
}

function refresh() {
  refreshDailyProgress(state);
  hydratePathwayProgress(state, pathways);
  updateSummary();
  renderPathwayPanel();
  renderCatalog();
  updateStageInfo(state, decorateLessons(lessons, state), els.currentStageLabel, els.currentStageDescription);
  exercisePool = pickExercisePool(lessons, state);
  saveState(state);
}

function saveAndRefresh() {
  saveState(state);
  refresh();
}

function updateSummary() {
  els.xpValue.textContent = state.profile.xp;
  els.levelValue.textContent = state.profile.level;
  els.streakValue.textContent = state.profile.streak;
  els.lessonsTodayValue.textContent = state.dailyProgress.lessonsCompletedToday;
  els.reviewsTodayValue.textContent = state.dailyProgress.reviewDoneToday;
  els.quizTodayValue.textContent = state.dailyProgress.quizDoneToday;

  const progressInLevel = state.profile.xp % CONFIG.xp.levelStep;
  const percent = clamp((progressInLevel / CONFIG.xp.levelStep) * 100, 0, 100);
  els.levelProgressBar.style.width = `${percent}%`;
  els.levelProgressText.textContent = `${progressInLevel} / ${CONFIG.xp.levelStep} XP vers le niveau suivant`;
  els.modeBadge.textContent = `Mode actuel : ${state.learningMode === 'free' ? 'libre' : 'parcours guidé'}`;

  const selectedPath = pathways.find((pathway) => pathway.id === state.selectedPathway);
  els.pathBadge.textContent = `Parcours : ${selectedPath?.title || 'aucun'}`;
  els.heroTitle.textContent = selectedPath?.title ? `Parcours actif : ${selectedPath.title}` : CONFIG.appTitle;
  els.heroText.textContent = selectedPath?.description || CONFIG.heroTextDefault;
}

function renderPathwayPanel() {
  renderPathways(pathways, state, els.pathwayList, (pathwayId) => {
    state.selectedPathway = pathwayId;
    state.learningMode = 'pathway';
    saveAndRefresh();
  });
}

function renderCatalog() {
  const search = els.searchInput.value.toLowerCase().trim();
  const decorated = decorateLessons(lessons, state);

  const visibleLessons = decorated.filter((lesson) => {
    const inSelectedPath = state.learningMode !== 'pathway' || !state.selectedPathway
      || lesson.pathways?.some((path) => path.id === state.selectedPathway);

    if (!inSelectedPath) return false;

    if (!search) return true;
    const corpus = [
      lesson.title,
      lesson.description,
      lesson.objective,
      lesson.context,
      ...(lesson.keyPoints || []).flatMap((point) => [point.front, point.back]),
      ...(lesson.explanations || []).flatMap((block) => [block.title, block.text]),
      ...(lesson.exercises || []).flatMap((exercise) => [exercise.prompt, exercise.instructions]),
    ]
      .join(' ')
      .toLowerCase();

    return corpus.includes(search);
  });

  renderLessonList(visibleLessons, state, els.lessonList, openLessonById);
}

function openLessonById(lessonId) {
  const decorated = decorateLessons(lessons, state);
  currentLesson = decorated.find((lesson) => lesson.id === lessonId);
  if (!currentLesson) return;

  els.lessonMeta.textContent = `${currentLesson.typeLabel} · ${currentLesson.exercises.length} exercice(s) · ${formatStage(currentLesson.currentStage)}`;
  els.lessonTitle.textContent = currentLesson.title;
  const inlineExerciseList = renderLessonDetail(currentLesson, els.lessonContent);
  renderInlineExercises(currentLesson, inlineExerciseList);

  els.lessonPlayer.classList.remove('hidden');
  els.lessonCatalogSection.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderInlineExercises(lesson, mountNode) {
  lesson.exercises.forEach((exercise) => {
    const slot = document.createElement('div');
    slot.className = 'inline-exercise';
    mountNode.appendChild(slot);
    renderExercise({ ...exercise, lessonTitle: lesson.title }, slot, {
      onAfterSubmit: (result) => {
        if (result.correct) {
          state.dailyProgress.quizDoneToday += 1;
          awardXP(state, CONFIG.xp.exerciseSuccess, `Exercice réussi : ${exercise.prompt}`);
          saveState(state);
          updateSummary();
        }
      },
    });
  });
}

function closeLesson() {
  currentLesson = null;
  els.lessonPlayer.classList.add('hidden');
  els.lessonCatalogSection.classList.remove('hidden');
}

function validateCurrentLesson() {
  if (!currentLesson) return;
  completeLesson(state, currentLesson);
  seedReviewCardsFromLesson(state, currentLesson);
  saveAndRefresh();
  closeLesson();
}

function startReviewSession() {
  const scopedLessonIds = state.learningMode === 'pathway' && state.selectedPathway
    ? lessons.filter((lesson) => lesson.pathways?.some((path) => path.id === state.selectedPathway)).map((lesson) => lesson.id)
    : null;

  const dueCards = getDueReviewCards(state, scopedLessonIds);
  const card = dueCards[0];

  if (!card) {
    els.reviewArea.innerHTML = '<p>Aucune carte à revoir pour le moment. Validez quelques capsules pour alimenter la révision espacée.</p>';
    return;
  }

  els.reviewArea.innerHTML = `
    <p class="section-meta">Carte issue de ${card.lessonId}</p>
    <h3>${card.prompt}</h3>
    <details>
      <summary>Afficher le rappel</summary>
      <p>${card.answer}</p>
    </details>
    <div class="exercise-toolbar">
      <button id="reviewHardBtn" class="secondary-btn">À revoir vite</button>
      <button id="reviewEasyBtn">Je maîtrise</button>
    </div>
  `;

  document.getElementById('reviewHardBtn').addEventListener('click', () => scoreReview('hard', card.id));
  document.getElementById('reviewEasyBtn').addEventListener('click', () => scoreReview('easy', card.id));
}

function scoreReview(quality, cardId) {
  scoreReviewCard(state, cardId, quality);
  state.dailyProgress.reviewDoneToday += 1;
  awardXP(state, CONFIG.xp.reviewSuccess, 'Révision espacée');
  saveAndRefresh();
  startReviewSession();
}

function startQuickExercise() {
  exercisePool = uniqueById(exercisePool);
  const exercise = exercisePool.shift();
  if (!exercise) {
    els.quizArea.innerHTML = '<p>Aucun exercice disponible. Ajoutez des exercices dans les données ou changez de parcours.</p>';
    return;
  }

  renderExercise(exercise, els.quizArea, {
    onAfterSubmit: (result) => {
      if (result.correct) {
        state.dailyProgress.quizDoneToday += 1;
        awardXP(state, CONFIG.xp.exerciseSuccess, `Exercice réussi : ${exercise.prompt}`);
        saveAndRefresh();
      }
    },
  });
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state = await importState(file);
    hydratePathwayProgress(state, pathways);
    saveAndRefresh();
  } catch {
    alert('Le fichier importé n’est pas exploitable.');
  } finally {
    els.importInput.value = '';
  }
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
