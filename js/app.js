import { CONFIG } from './config.js';
import { loadData } from './dataService.js';
import { exportState, importState, saveState, loadState, createDefaultState } from './storage.js';
import { hydratePathwayProgress, refreshDailyProgress, decorateLessons, completeLesson } from './state.js';
import { renderPathways, renderLessonList, renderLessonDetail, renderPathwayShowcase, updateStageInfo, renderContinueCard } from './renderers.js';
import { seedReviewCardsFromLesson, getDueReviewCards, scoreReviewCard } from './review.js';
import { pickExercisePool, renderExercise } from './exercises.js';
import { clamp } from './utils.js';

let state = loadState(CONFIG.storageKey) || createDefaultState();
let pathways = [];
let lessons = [];
let currentLesson = null;
let exercisePool = [];
let currentView = 'home';

const els = {
  homeViewBtn: document.getElementById('homeViewBtn'),
  exploreViewBtn: document.getElementById('exploreViewBtn'),
  homeView: document.getElementById('homeView'),
  exploreView: document.getElementById('exploreView'),
  continueBtn: document.getElementById('continueBtn'),
  goExploreBtn: document.getElementById('goExploreBtn'),
  continueTitle: document.getElementById('continueTitle'),
  continueText: document.getElementById('continueText'),
  continueWorkshopCard: document.getElementById('continueWorkshopCard'),
  xpValue: document.getElementById('xpValue'),
  levelValue: document.getElementById('levelValue'),
  streakValue: document.getElementById('streakValue'),
  levelProgressBar: document.getElementById('levelProgressBar'),
  levelProgressText: document.getElementById('levelProgressText'),
  freeModeBtn: document.getElementById('freeModeBtn'),
  pathModeBtn: document.getElementById('pathModeBtn'),
  modeBadge: document.getElementById('modeBadge'),
  pathBadge: document.getElementById('pathBadge'),
  heroTitle: document.getElementById('heroTitle'),
  heroText: document.getElementById('heroText'),
  dailyGoalText: document.getElementById('dailyGoalText'),
  searchInput: document.getElementById('searchInput'),
  pathwayList: document.getElementById('pathwayList'),
  pathwayShowcase: document.getElementById('pathwayShowcase'),
  pathwayInlineBadge: document.getElementById('pathwayInlineBadge'),
  lessonList: document.getElementById('lessonList'),
  lessonCatalogSection: document.getElementById('lessonCatalogSection'),
  lessonPlayer: document.getElementById('lessonPlayer'),
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
  lessonsTodayDashboard: document.getElementById('lessonsTodayDashboard'),
  reviewsTodayDashboard: document.getElementById('reviewsTodayDashboard'),
  quizTodayDashboard: document.getElementById('quizTodayDashboard'),
  profileModalBtn: document.getElementById('profileModalBtn'),
  settingsModalBtn: document.getElementById('settingsModalBtn'),
  saveModalBtn: document.getElementById('saveModalBtn'),
  profileModal: document.getElementById('profileModal'),
  settingsModal: document.getElementById('settingsModal'),
  saveModal: document.getElementById('saveModal'),
  closeProfileModalBtn: document.getElementById('closeProfileModalBtn'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  closeSaveModalBtn: document.getElementById('closeSaveModalBtn'),
  reviewShortcutBtn: document.getElementById('reviewShortcutBtn'),
  quizShortcutBtn: document.getElementById('quizShortcutBtn'),
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const data = await loadData();
  pathways = data.pathways;
  lessons = data.lessons;
  state.learningMode = state.learningMode || 'pathway';
  if (!state.selectedPathway && pathways.length) state.selectedPathway = pathways[0].id;
  hydratePathwayProgress(state, pathways);
  bindEvents();
  registerSW();
  refresh();
}

function bindEvents() {
  els.homeViewBtn.addEventListener('click', () => switchView('home'));
  els.exploreViewBtn.addEventListener('click', () => switchView('explore'));
  els.goExploreBtn.addEventListener('click', () => switchView('explore'));
  els.continueBtn.addEventListener('click', () => {
    const next = getNextRecommendedLesson();
    if (next) openLesson(next.id);
    else switchView('explore');
  });
  els.freeModeBtn.addEventListener('click', () => { state.learningMode = 'free'; saveAndRefresh(); });
  els.pathModeBtn.addEventListener('click', () => { state.learningMode = 'pathway'; if (!state.selectedPathway && pathways.length) state.selectedPathway = pathways[0].id; saveAndRefresh(); });
  els.searchInput.addEventListener('input', renderCatalog);
  els.startReviewBtn.addEventListener('click', startReviewSession);
  els.startQuizBtn.addEventListener('click', startQuickExercise);
  els.reviewShortcutBtn?.addEventListener('click', () => { openModal(els.profileModal); startReviewSession(); });
  els.quizShortcutBtn?.addEventListener('click', () => { openModal(els.profileModal); startQuickExercise(); });
  els.exportBtn.addEventListener('click', () => exportState(state));
  els.importInput.addEventListener('change', handleImport);
  els.resetBtn.addEventListener('click', () => { state = createDefaultState(); state.learningMode = 'pathway'; hydratePathwayProgress(state, pathways); state.selectedPathway = pathways[0]?.id || null; saveAndRefresh(); });
  els.profileModalBtn?.addEventListener('click', () => openModal(els.profileModal));
  els.settingsModalBtn?.addEventListener('click', () => openModal(els.settingsModal));
  els.saveModalBtn?.addEventListener('click', () => openModal(els.saveModal));
  els.closeProfileModalBtn?.addEventListener('click', () => closeModal(els.profileModal));
  els.closeSettingsModalBtn?.addEventListener('click', () => closeModal(els.settingsModal));
  els.closeSaveModalBtn?.addEventListener('click', () => closeModal(els.saveModal));
  document.addEventListener('click', (event) => {
    if (event.target.matches("[data-close-modal='profile']")) closeModal(els.profileModal);
    if (event.target.matches("[data-close-modal='settings']")) closeModal(els.settingsModal);
    if (event.target.matches("[data-close-modal='save']")) closeModal(els.saveModal);

    const lessonOpen = event.target.closest('[data-open-lesson]');
    if (lessonOpen) openLesson(lessonOpen.dataset.openLesson);
    const closeBtn = event.target.closest('[data-close-workshop]');
    if (closeBtn) closeLesson();
    const completeBtn = event.target.closest('[data-complete-workshop]');
    if (completeBtn) validateCurrentLesson();
    const understandToggle = event.target.closest('[data-toggle-understand]');
    if (understandToggle) {
      const section = document.getElementById('understandSection');
      section?.classList.toggle('collapsed');
      understandToggle.textContent = section?.classList.contains('collapsed') ? 'Déplier comprendre' : 'Replier comprendre';
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal(els.profileModal); closeModal(els.settingsModal); closeModal(els.saveModal);
    }
  });
}

function openModal(el) { if (!el) return; el.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(el) { if (!el) return; el.classList.add('hidden'); document.body.style.overflow = ''; }

function refresh() {
  refreshDailyProgress(state);
  hydratePathwayProgress(state, pathways);
  updateSummary();
  renderPathwayPanel();
  renderCatalog();
  renderShowcase();
  renderContinueArea();
  updateStageInfo(state, decorateLessons(lessons, state), els.currentStageLabel, els.currentStageDescription);
  exercisePool = pickExercisePool(lessons, state);
  saveState(state, CONFIG.storageKey);
}

function saveAndRefresh() { saveState(state, CONFIG.storageKey); refresh(); }

function switchView(viewName) {
  currentView = viewName;
  els.homeView.classList.toggle('hidden', viewName !== 'home');
  els.exploreView.classList.toggle('hidden', viewName !== 'explore');
  els.homeViewBtn.classList.toggle('active', viewName === 'home');
  els.exploreViewBtn.classList.toggle('active', viewName === 'explore');
  if (viewName === 'explore') els.lessonPlayer.classList.add('hidden');
}

function updateSummary() {
  els.xpValue.textContent = state.profile.xp;
  els.levelValue.textContent = state.profile.level;
  els.streakValue.textContent = state.profile.streak;
  [els.lessonsTodayValue, els.lessonsTodayDashboard].forEach(el => el.textContent = state.dailyProgress.lessonsCompletedToday);
  [els.reviewsTodayValue, els.reviewsTodayDashboard].forEach(el => el.textContent = state.dailyProgress.reviewDoneToday);
  [els.quizTodayValue, els.quizTodayDashboard].forEach(el => el.textContent = state.dailyProgress.quizDoneToday);
  const progressInLevel = state.profile.xp % CONFIG.xp.levelStep;
  const percent = clamp((progressInLevel / CONFIG.xp.levelStep) * 100, 0, 100);
  els.levelProgressBar.style.width = `${percent}%`;
  els.levelProgressText.textContent = `${progressInLevel} / ${CONFIG.xp.levelStep} XP vers le niveau suivant`;
  els.modeBadge.textContent = state.learningMode === 'free' ? 'Mode libre' : 'Mode parcours';
  els.pathBadge.textContent = pathways.find((pathway) => pathway.id === state.selectedPathway)?.title || 'Aucun parcours';
  els.heroTitle.textContent = 'Tableau de bord de pratique';
  els.heroText.textContent = 'Revenez au prochain atelier conseillé, travaillez une carte de révision ou utilisez un test rapide pour ancrer ce que vous venez de jouer.';
  els.freeModeBtn.classList.toggle('active', state.learningMode === 'free');
  els.pathModeBtn.classList.toggle('active', state.learningMode === 'pathway');
  els.pathwayInlineBadge.textContent = state.learningMode === 'pathway' ? 'Mode parcours' : 'Mode libre';
}

function renderShowcase() {
  const enriched = pathways.map((pathway) => ({
    ...pathway,
    lessonCount: lessons.filter((lesson) => lesson.pathways?.some((path) => path.id === pathway.id)).length,
  }));
  renderPathwayShowcase(enriched, state, els.pathwayShowcase, (pathwayId) => {
    state.selectedPathway = pathwayId;
    state.learningMode = 'pathway';
    saveAndRefresh();
  });
}

function renderPathwayPanel() {
  const enriched = pathways.map((pathway) => ({
    ...pathway,
    lessonCount: lessons.filter((lesson) => lesson.pathways?.some((path) => path.id === pathway.id)).length,
  }));
  renderPathways(enriched, state, els.pathwayList, (pathwayId) => { state.selectedPathway = pathwayId; state.learningMode = 'pathway'; saveAndRefresh(); });
}

function getFilteredLessons() {
  const query = els.searchInput.value.trim().toLowerCase();
  const decorated = decorateLessons(lessons, state);
  const scoped = state.learningMode === 'pathway' && state.selectedPathway
    ? decorated.filter((lesson) => lesson.pathways?.some((path) => path.id === state.selectedPathway))
    : decorated;
  if (!query) return scoped;
  return scoped.filter((lesson) => {
    const haystack = [lesson.title, lesson.description, lesson.objective, lesson.context, lesson.sessionIntent, ...(lesson.keyPoints || []).flatMap((point) => [point.front, point.back]), ...(lesson.explanations || []).flatMap((block) => [block.title, block.text])].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderCatalog() {
  const visibleLessons = getFilteredLessons();
  renderLessonList(visibleLessons, state, els.lessonList, openLesson);
}

function getNextRecommendedLesson() {
  const decorated = decorateLessons(lessons, state);
  const scoped = state.learningMode === 'pathway' && state.selectedPathway
    ? decorated.filter((lesson) => lesson.pathways?.some((path) => path.id === state.selectedPathway))
    : decorated;
  return scoped.find((lesson) => !lesson.locked && !lesson.completed) || scoped.find((lesson) => !lesson.completed) || scoped[0] || null;
}

function renderContinueArea() {
  const next = getNextRecommendedLesson();
  if (!next) {
    els.continueTitle.textContent = 'Parcours prêt';
    els.continueText.textContent = 'Activez un parcours ou passez en exploration libre pour ouvrir un atelier.';
    els.continueWorkshopCard.innerHTML = '<p class="small-text">Aucun atelier recommandé pour le moment.</p>';
    return;
  }
  const pathwayInfo = next.pathways?.find((path) => path.id === state.selectedPathway) || next.pathways?.[0];
  els.continueTitle.textContent = next.title;
  els.continueText.textContent = `${pathways.find((pathway) => pathway.id === pathwayInfo?.id)?.title || 'Parcours'} · ${pathwayInfo?.stage || 'hors parcours'}`;
  renderContinueCard(next, pathways, els.continueWorkshopCard);
}

function openLesson(lessonId) {
  currentLesson = lessons.find((lesson) => lesson.id === lessonId) || null;
  if (!currentLesson) return;
  switchView('explore');
  renderLessonDetail(currentLesson, els.lessonPlayer, state, pathways);
  els.lessonPlayer.classList.remove('hidden');
  els.lessonPlayer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeLesson() {
  currentLesson = null;
  els.lessonPlayer.classList.add('hidden');
  els.lessonCatalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateCurrentLesson() {
  if (!currentLesson) return;
  completeLesson(state, currentLesson);
  seedReviewCardsFromLesson(state, currentLesson);
  saveAndRefresh();
  renderLessonDetail(currentLesson, els.lessonPlayer, state, pathways);
}

function startReviewSession() {
  const selectedLessonIds = state.learningMode === 'pathway' && state.selectedPathway
    ? lessons.filter((lesson) => lesson.pathways?.some((path) => path.id === state.selectedPathway)).map((lesson) => lesson.id)
    : null;
  const due = getDueReviewCards(state, selectedLessonIds);
  if (!due.length) {
    els.reviewArea.innerHTML = '<p>Aucune carte n’est due pour le moment. Validez un atelier ou revenez plus tard.</p>';
    return;
  }
  const card = due[0];
  els.reviewArea.innerHTML = `
    <div class="review-card">
      <p class="section-meta">Repère à réactiver</p>
      <h4>${card.prompt}</h4>
      <details><summary>Afficher le rappel</summary><p>${card.answer}</p></details>
      <div class="review-actions">
        <button data-review-score="hard">À revoir</button>
        <button data-review-score="easy" class="secondary-btn">C’était fluide</button>
      </div>
    </div>
  `;
  els.reviewArea.querySelectorAll('[data-review-score]').forEach((btn) => btn.addEventListener('click', () => {
    scoreReviewCard(state, card.id, btn.dataset.reviewScore);
    state.dailyProgress.reviewDoneToday += 1;
    saveAndRefresh();
    startReviewSession();
  }));
}

function startQuickExercise() {
  if (!exercisePool.length) {
    els.quizArea.innerHTML = '<p>Aucun exercice disponible.</p>';
    return;
  }
  const exercise = exercisePool[Math.floor(Math.random() * exercisePool.length)];
  renderExercise(exercise, els.quizArea, () => {
    state.dailyProgress.quizDoneToday += 1;
    saveAndRefresh();
  });
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state = await importState(file);
    hydratePathwayProgress(state, pathways);
    saveAndRefresh();
  } catch (error) {
    alert('Import impossible. Vérifiez le fichier JSON.');
  }
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}
