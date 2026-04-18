import { CONFIG } from './config.js';
import { loadData } from './dataService.js';
import { renderExercise, pickExercisePool } from './exercises.js';
import { renderLessonDetail, renderLessonList, renderPathways, updateStageInfo } from './renderers.js';
import { getDueReviewCards, scoreReviewCard, seedReviewCardsFromLesson } from './review.js';
import { awardXP, completeLesson, decorateLessons, hydratePathwayProgress, refreshDailyProgress } from './state.js';
import { exportState, importState, loadState, saveState, createDefaultState } from './storage.js';
import { clamp, uniqueById } from './utils.js';

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
  dailyGoalText: document.getElementById('dailyGoalText'),
  searchInput: document.getElementById('searchInput'),
  pathwayList: document.getElementById('pathwayList'),
  pathwaySection: document.getElementById('pathwaySection'),
  pathwayInlineBadge: document.getElementById('pathwayInlineBadge'),
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
  profileModalBtn: document.getElementById('profileModalBtn'),
  settingsModalBtn: document.getElementById('settingsModalBtn'),
  saveModalBtn: document.getElementById('saveModalBtn'),
  profileModal: document.getElementById('profileModal'),
  settingsModal: document.getElementById('settingsModal'),
  saveModal: document.getElementById('saveModal'),
  closeProfileModalBtn: document.getElementById('closeProfileModalBtn'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  closeSaveModalBtn: document.getElementById('closeSaveModalBtn'),
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const data = await loadData();
  pathways = data.pathways;
  lessons = data.lessons;

  if (!state.selectedPathway && pathways.length) {
    state.selectedPathway = pathways[0].id;
  }

  hydratePathwayProgress(state, pathways);
  bindEvents();
  registerSW();
  refresh();
}

function bindEvents() {
  els.freeModeBtn.addEventListener('click', () => {
    state.learningMode = 'free';
    closeModal(els.settingsModal);
    saveAndRefresh();
  });

  els.pathModeBtn.addEventListener('click', () => {
    state.learningMode = 'pathway';
    if (!state.selectedPathway && pathways.length) state.selectedPathway = pathways[0].id;
    closeModal(els.settingsModal);
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

  els.profileModalBtn?.addEventListener('click', () => openModal(els.profileModal));
  els.settingsModalBtn?.addEventListener('click', () => openModal(els.settingsModal));
  els.saveModalBtn?.addEventListener('click', () => openModal(els.saveModal));
  els.closeProfileModalBtn?.addEventListener('click', () => closeModal(els.profileModal));
  els.closeSettingsModalBtn?.addEventListener('click', () => closeModal(els.settingsModal));
  els.closeSaveModalBtn?.addEventListener('click', () => closeModal(els.saveModal));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal(els.profileModal);
      closeModal(els.settingsModal);
      closeModal(els.saveModal);
    }
  });

  els.profileModal?.addEventListener('click', (event) => {
    if (event.target.matches("[data-close-modal='profile']")) closeModal(els.profileModal);
  });
  els.settingsModal?.addEventListener('click', (event) => {
    if (event.target.matches("[data-close-modal='settings']")) closeModal(els.settingsModal);
  });
  els.saveModal?.addEventListener('click', (event) => {
    if (event.target.matches("[data-close-modal='save']")) closeModal(els.saveModal);
  });
}

function openModal(el) {
  if (!el) return;
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(el) {
  if (!el) return;
  el.classList.add('hidden');
  document.body.style.overflow = '';
}

function refresh() {
  refreshDailyProgress(state);
  hydratePathwayProgress(state, pathways);
  updateSummary();
  renderPathwayPanel();
  renderCatalog();
  updateMainNavigationState();
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
  els.modeBadge.textContent = `Mode ${state.learningMode === 'free' ? 'libre' : 'parcours'}`;

  const selectedPath = pathways.find((pathway) => pathway.id === state.selectedPathway);
  els.pathBadge.textContent = selectedPath?.title || 'Aucun parcours';
  els.heroTitle.textContent = state.learningMode === 'free' ? 'Exploration libre' : 'Parcours guidé';
  els.heroText.textContent = state.learningMode === 'free'
    ? 'L’écran principal affiche directement les capsules. Ouvrez la fenêtre de tableau de bord pour lancer une révision, un exercice rapide ou suivre votre activité.'
    : 'Le gabarit recentre le parcours utilisateur : colonne latérale pour le stage et le choix du parcours, zone centrale pour les capsules, tableau de bord séparé pour les actions transverses.';
  els.dailyGoalText.textContent = '1 capsule + 1 révision';

  els.freeModeBtn.classList.toggle('active', state.learningMode === 'free');
  els.pathModeBtn.classList.toggle('active', state.learningMode === 'pathway');
}

function updateMainNavigationState() {
  const inPathwayMode = state.learningMode === 'pathway';
  els.pathwaySection.classList.toggle('hidden', !inPathwayMode);
  els.pathwayInlineBadge.textContent = inPathwayMode ? 'Mode parcours' : 'Mode libre';
}

function renderPathwayPanel() {
  const enriched = pathways.map((pathway) => ({
    ...pathway,
    lessonCount: lessons.filter((lesson) => lesson.pathways?.some((path) => path.id === pathway.id)).length,
  }));

  renderPathways(enriched, state, els.pathwayList, (pathwayId) => {
    state.selectedPathway = pathwayId;
    state.learningMode = 'pathway';
    saveAndRefresh();
  });
}

function getFilteredLessons() {
  const query = els.searchInput.value.trim().toLowerCase();
  const decorated = decorateLessons(lessons, state);

  const scoped = state.learningMode === 'pathway' && state.selectedPathway
    ? decorated.filter((lesson) => lesson.pathways?.some((path) => path.id === state.selectedPathway))
    : decorated;

  if (!query) return scoped;

  return scoped.filter((lesson) => {
    const haystack = [
      lesson.title,
      lesson.description,
      lesson.objective,
      lesson.context,
      ...(lesson.keyPoints || []).flatMap((point) => [point.front, point.back]),
      ...(lesson.explanations || []).flatMap((block) => [block.title, block.text]),
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderCatalog() {
  const visibleLessons = getFilteredLessons();
  renderLessonList(visibleLessons, state, els.lessonList, openLesson);
}

function openLesson(lessonId) {
  currentLesson = lessons.find((lesson) => lesson.id === lessonId) || null;
  if (!currentLesson) return;

  const pathwayInfo = currentLesson.pathways?.find((path) => path.id === state.selectedPathway);
  els.lessonMeta.textContent = `${currentLesson.typeLabel || currentLesson.type} · ${pathwayInfo ? pathwayInfo.stage : 'hors parcours'}`;
  els.lessonTitle.textContent = currentLesson.title;
  renderLessonDetail(currentLesson, els.lessonContent);
  els.lessonPlayer.classList.remove('hidden');
  els.lessonCatalogSection.classList.add('hidden');
  els.lessonPlayer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeLesson() {
  currentLesson = null;
  els.lessonPlayer.classList.add('hidden');
  els.lessonCatalogSection.classList.remove('hidden');
  els.lessonCatalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <summary>Afficher la réponse</summary>
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
    els.quizArea.innerHTML = '<p>Aucun exercice disponible. Ajoutez des exercices dans les fichiers de données ou changez de parcours.</p>';
    return;
  }

  renderExercise(exercise, els.quizArea);
  const form = els.quizArea.querySelector('form');
  form?.addEventListener('submit', () => {
    requestAnimationFrame(() => {
      if (form.dataset.lastResult === 'success') {
        state.dailyProgress.quizDoneToday += 1;
        awardXP(state, CONFIG.xp.exerciseSuccess, `Exercice réussi : ${exercise.prompt}`);
        saveAndRefresh();
      }
    });
  }, { once: true });
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state = await importState(file);
    hydratePathwayProgress(state, pathways);
    saveAndRefresh();
    closeModal(els.saveModal);
  } catch (error) {
    console.error(error);
    alert('Impossible d’importer ce fichier.');
  } finally {
    event.target.value = '';
  }
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
