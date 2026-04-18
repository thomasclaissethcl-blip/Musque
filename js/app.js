import { CONFIG } from './config.js';
import { loadData } from './dataService.js';
import { exportState, importState, saveState, loadState, createDefaultState } from './storage.js';
import { hydratePathwayProgress, refreshDailyProgress, decorateLessons, completeLesson, awardXP } from './state.js';
import { renderLessonList, renderLessonModal, renderPathwayProgress, renderContinueCard } from './renderers.js';
import { seedReviewCardsFromLesson, getDueReviewCards, scoreReviewCard } from './review.js';
import { pickExercisePool, renderExercise } from './exercises.js';
import { clamp, todayISO } from './utils.js';
import { attachAudioPlayers, stopAllPlayers } from './midiEngine.js';

let state = loadState() || createDefaultState();
let pathways = [];
let lessons = [];
let currentLessonId = null;
let activeModal = null;
let exercisePool = [];

const els = {
  homeBtn: document.getElementById('homeBtn'),
  challengeBtn: document.getElementById('challengeBtn'),
  progressBtn: document.getElementById('progressBtn'),
  dataBtn: document.getElementById('dataBtn'),
  challengeToggle: document.getElementById('challengeToggle'),
  challengePanel: document.getElementById('challengePanel'),
  challengeModalBody: document.getElementById('challengeModalBody'),
  continueTitle: document.getElementById('continueTitle'),
  continueText: document.getElementById('continueText'),
  continueCardBody: document.getElementById('continueCardBody'),
  continueBtn: document.getElementById('continueBtn'),
  pathwaySelect: document.getElementById('pathwaySelect'),
  selectedPathwayTitle: document.getElementById('selectedPathwayTitle'),
  selectedPathwayDescription: document.getElementById('selectedPathwayDescription'),
  searchInput: document.getElementById('searchInput'),
  lessonList: document.getElementById('lessonList'),
  catalogMeta: document.getElementById('catalogMeta'),
  xpValue: document.getElementById('xpValue'),
  levelValue: document.getElementById('levelValue'),
  streakValue: document.getElementById('streakValue'),
  levelProgressBar: document.getElementById('levelProgressBar'),
  levelProgressText: document.getElementById('levelProgressText'),
  progressXpValue: document.getElementById('progressXpValue'),
  progressLevelValue: document.getElementById('progressLevelValue'),
  progressStreakValue: document.getElementById('progressStreakValue'),
  lessonsTodayValue: document.getElementById('lessonsTodayValue'),
  reviewsTodayValue: document.getElementById('reviewsTodayValue'),
  quizTodayValue: document.getElementById('quizTodayValue'),
  pathwayProgressList: document.getElementById('pathwayProgressList'),
  reviewArea: document.getElementById('reviewArea'),
  startReviewBtn: document.getElementById('startReviewBtn'),
  lessonModal: document.getElementById('lessonModal'),
  lessonModalMeta: document.getElementById('lessonModalMeta'),
  lessonModalTitle: document.getElementById('lessonModalTitle'),
  lessonModalBody: document.getElementById('lessonModalBody'),
  prevLessonBtn: document.getElementById('prevLessonBtn'),
  nextLessonBtn: document.getElementById('nextLessonBtn'),
  closeLessonBtn: document.getElementById('closeLessonBtn'),
  progressModal: document.getElementById('progressModal'),
  closeProgressModalBtn: document.getElementById('closeProgressModalBtn'),
  challengeModal: document.getElementById('challengeModal'),
  closeChallengeModalBtn: document.getElementById('closeChallengeModalBtn'),
  dataModal: document.getElementById('dataModal'),
  closeDataModalBtn: document.getElementById('closeDataModalBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetBtn: document.getElementById('resetBtn'),
  toast: document.getElementById('toast'),
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const data = await loadData();
  pathways = data.pathways;
  lessons = data.lessons;
  hydratePathwayProgress(state, pathways);
  if (!Object.prototype.hasOwnProperty.call(state, 'selectedPathway')) state.selectedPathway = null;
  registerSW();
  populatePathwaySelect();
  bindEvents();
  refresh();
}

function bindEvents() {
  els.homeBtn.addEventListener('click', () => {
    closeAllModals();
    highlightNav(els.homeBtn);
    showToast('Retour à l’accueil.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  els.challengeBtn.addEventListener('click', () => {
    openModal(els.challengeModal, els.challengeBtn, 'Défi du jour ouvert.');
    renderDailyChallenge(els.challengeModalBody, true);
  });
  els.progressBtn.addEventListener('click', () => {
    openModal(els.progressModal, els.progressBtn, 'Progression affichée.');
  });
  els.dataBtn.addEventListener('click', () => {
    openModal(els.dataModal, els.dataBtn, 'Options de données affichées.');
  });

  els.challengeToggle.addEventListener('click', () => {
    const willOpen = els.challengePanel.classList.contains('hidden');
    els.challengePanel.classList.toggle('hidden');
    els.challengeToggle.setAttribute('aria-expanded', String(willOpen));
    els.challengeToggle.querySelector('.toggle-indicator').textContent = willOpen ? '−' : '+';
    if (willOpen) renderDailyChallenge(els.challengePanel, false);
  });

  els.pathwaySelect.addEventListener('change', () => {
    state.selectedPathway = els.pathwaySelect.value === 'all' ? null : els.pathwaySelect.value;
    state.learningMode = state.selectedPathway ? 'pathway' : 'free';
    saveState(state);
    refresh();
    const msg = state.selectedPathway ? `Parcours « ${getSelectedPathway()?.title || ''} » sélectionné.` : 'Mode à la carte activé.';
    showToast(msg);
  });

  els.searchInput.addEventListener('input', renderCatalog);
  els.continueBtn.addEventListener('click', () => {
    const lesson = getNextRecommendedLesson();
    if (lesson) openLesson(lesson.id);
  });
  els.prevLessonBtn.addEventListener('click', () => navigateLesson(-1));
  els.nextLessonBtn.addEventListener('click', () => navigateLesson(1));
  els.closeLessonBtn.addEventListener('click', closeLessonModal);
  els.closeProgressModalBtn.addEventListener('click', () => closeModal(els.progressModal));
  els.closeChallengeModalBtn.addEventListener('click', () => closeModal(els.challengeModal));
  els.closeDataModalBtn.addEventListener('click', () => closeModal(els.dataModal));
  els.startReviewBtn.addEventListener('click', startReviewSession);
  els.exportBtn.addEventListener('click', () => exportState(state));
  els.importInput.addEventListener('change', handleImport);
  els.resetBtn.addEventListener('click', () => {
    state = createDefaultState();
    hydratePathwayProgress(state, pathways);
    populatePathwaySelect();
    refresh();
    showToast('Progression réinitialisée.');
  });

  document.addEventListener('click', (event) => {
    const closeTarget = event.target.dataset.closeModal;
    if (closeTarget === 'progress') closeModal(els.progressModal);
    if (closeTarget === 'challenge') closeModal(els.challengeModal);
    if (closeTarget === 'data') closeModal(els.dataModal);

    const opener = event.target.closest('[data-open-lesson]');
    if (opener) openLesson(opener.dataset.openLesson);

    const complete = event.target.closest('[data-complete-workshop]');
    if (complete) validateCurrentLesson();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!els.lessonModal.classList.contains('hidden')) closeLessonModal();
      closeModal(els.progressModal);
      closeModal(els.challengeModal);
      closeModal(els.dataModal);
    }
  });
}

function populatePathwaySelect() {
  const current = state.selectedPathway || 'all';
  els.pathwaySelect.innerHTML = '<option value="all">À la carte</option>' + pathways.map((pathway) => `<option value="${pathway.id}">${pathway.title}</option>`).join('');
  els.pathwaySelect.value = current;
}

function refresh() {
  refreshDailyProgress(state);
  hydratePathwayProgress(state, pathways);
  exercisePool = pickExercisePool(lessons, state);
  updateHeaderStats();
  updateSelectionInfo();
  renderCatalog();
  renderContinue();
  renderPathwayProgress(pathways, lessons, state, els.pathwayProgressList);
  if (!els.challengePanel.classList.contains('hidden')) renderDailyChallenge(els.challengePanel, false);
  if (!els.challengeModal.classList.contains('hidden')) renderDailyChallenge(els.challengeModalBody, true);
  saveState(state);
}

function updateHeaderStats() {
  const xp = state.profile.xp;
  const progressInLevel = xp % CONFIG.xp.levelStep;
  const percent = clamp((progressInLevel / CONFIG.xp.levelStep) * 100, 0, 100);
  [els.xpValue, els.progressXpValue].forEach((el) => { el.textContent = xp; });
  [els.levelValue, els.progressLevelValue].forEach((el) => { el.textContent = state.profile.level; });
  [els.streakValue, els.progressStreakValue].forEach((el) => { el.textContent = state.profile.streak; });
  els.levelProgressBar.style.width = `${percent}%`;
  els.levelProgressText.textContent = `${progressInLevel} / ${CONFIG.xp.levelStep} XP`;
  els.lessonsTodayValue.textContent = state.dailyProgress.lessonsCompletedToday;
  els.reviewsTodayValue.textContent = state.dailyProgress.reviewDoneToday;
  els.quizTodayValue.textContent = state.dailyProgress.quizDoneToday;
}

function updateSelectionInfo() {
  const pathway = getSelectedPathway();
  if (!pathway) {
    els.selectedPathwayTitle.textContent = 'À la carte';
    els.selectedPathwayDescription.textContent = 'Vous pouvez ouvrir n’importe quel atelier du catalogue.';
    return;
  }
  els.selectedPathwayTitle.textContent = pathway.title;
  els.selectedPathwayDescription.textContent = pathway.description;
}

function getDecoratedLessons() {
  return decorateLessons(lessons, state);
}

function getVisibleLessons() {
  const query = els.searchInput.value.trim().toLowerCase();
  const decorated = getDecoratedLessons();
  const scoped = state.selectedPathway ? decorated.filter((lesson) => lesson.pathways?.some((path) => path.id === state.selectedPathway)) : decorated;
  return scoped.filter((lesson) => {
    if (!query) return true;
    const haystack = [lesson.title, lesson.description, lesson.objective, lesson.sessionIntent, lesson.variationPrompt, ...(lesson.keyPoints || []).flatMap((point) => [point.front, point.back])].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderCatalog() {
  const visible = getVisibleLessons();
  renderLessonList(visible, els.lessonList);
  els.catalogMeta.textContent = `${visible.length} atelier${visible.length > 1 ? 's' : ''}`;
}

function getSelectedPathway() {
  return pathways.find((pathway) => pathway.id === state.selectedPathway) || null;
}

function getNextRecommendedLesson() {
  const visible = getVisibleLessons();
  return visible.find((lesson) => !lesson.locked && !lesson.completed) || visible.find((lesson) => !lesson.completed) || visible[0] || null;
}

function renderContinue() {
  const next = getNextRecommendedLesson();
  if (!next) {
    els.continueTitle.textContent = 'Aucune séance recommandée';
    els.continueText.textContent = 'Modifiez le filtre ou passez en mode à la carte.';
    els.continueCardBody.innerHTML = '<p class="muted-text">Aucun atelier n’est disponible avec cette sélection.</p>';
    els.continueBtn.disabled = true;
    return;
  }
  const pathwayTitle = getSelectedPathway()?.title || 'À la carte';
  els.continueTitle.textContent = next.title;
  els.continueText.textContent = next.description || next.sessionIntent || '';
  els.continueCardBody.innerHTML = renderContinueCard(next, pathwayTitle);
  els.continueBtn.disabled = false;
}

function getVisibleUnlockedLessons() {
  return getVisibleLessons().filter((lesson) => !lesson.locked);
}

function openLesson(lessonId) {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) return;
  currentLessonId = lessonId;
  stopAllPlayers(document);
  const rendered = renderLessonModal(lesson, pathways, state.selectedPathway || 'all');
  els.lessonModalMeta.textContent = rendered.meta;
  els.lessonModalTitle.textContent = rendered.title;
  els.lessonModalBody.innerHTML = rendered.html;
  const exercise = lesson.exercises?.[0];
  const mount = document.getElementById('lessonExerciseMount');
  if (exercise && mount) {
    renderExercise({ ...exercise, lessonTitle: lesson.title }, mount, (result) => {
      if (result.correct) {
        awardXP(state, CONFIG.xp.exerciseSuccess, 'Exercice réussi');
        state.dailyProgress.quizDoneToday += 1;
        refresh();
      }
    });
  }
  attachAudioPlayers(els.lessonModalBody);
  updateLessonNavButtons();
  openModal(els.lessonModal, null, `Atelier « ${lesson.title} » ouvert.`);
}

function closeLessonModal() {
  stopAllPlayers(document);
  currentLessonId = null;
  closeModal(els.lessonModal);
}

function getCurrentLessonIndex() {
  const visible = getVisibleUnlockedLessons();
  return visible.findIndex((lesson) => lesson.id === currentLessonId);
}

function navigateLesson(direction) {
  const visible = getVisibleUnlockedLessons();
  const index = getCurrentLessonIndex();
  if (index < 0) return;
  const next = visible[index + direction];
  if (next) openLesson(next.id);
}

function updateLessonNavButtons() {
  const visible = getVisibleUnlockedLessons();
  const index = getCurrentLessonIndex();
  els.prevLessonBtn.disabled = index <= 0;
  els.nextLessonBtn.disabled = index < 0 || index >= visible.length - 1;
}

function validateCurrentLesson() {
  const lesson = lessons.find((item) => item.id === currentLessonId);
  if (!lesson) return;
  completeLesson(state, lesson);
  seedReviewCardsFromLesson(state, lesson);
  refresh();
  showToast(`Séance validée : ${lesson.title}.`);
  openLesson(lesson.id);
}

function getDailyChallenge() {
  const pool = pickExercisePool(lessons, { ...state, learningMode: 'free', selectedPathway: null });
  if (!pool.length) return null;
  const seed = Number(todayISO().replaceAll('-', ''));
  return pool[seed % pool.length];
}

function renderDailyChallenge(mountNode, inModal) {
  const challenge = getDailyChallenge();
  if (!challenge) {
    mountNode.innerHTML = '<p class="muted-text">Aucun défi disponible.</p>';
    return;
  }
  mountNode.innerHTML = `
    <div class="muted-panel">
      <p class="eyebrow">Un seul défi, renouvelé chaque jour</p>
      <h3>${challenge.lessonTitle || 'Défi du jour'}</h3>
      <p class="muted-text">Travaillez d’abord l’idée sur votre instrument, puis répondez pour vérifier ce que vous avez réellement perçu.</p>
    </div>
    <div id="dailyChallengeExercise" class="exercise-box" style="margin-top:1rem;"></div>
  `;
  renderExercise(challenge, mountNode.querySelector('#dailyChallengeExercise'), (result) => {
    if (result.correct) {
      awardXP(state, CONFIG.xp.exerciseSuccess, 'Défi du jour réussi');
      state.dailyProgress.quizDoneToday += 1;
      refresh();
      showToast('Défi du jour réussi.');
    }
  });
  if (inModal) highlightNav(els.challengeBtn);
}

function startReviewSession() {
  const scopedLessonIds = state.selectedPathway ? lessons.filter((lesson) => lesson.pathways?.some((path) => path.id === state.selectedPathway)).map((lesson) => lesson.id) : null;
  const due = getDueReviewCards(state, scopedLessonIds);
  if (!due.length) {
    els.reviewArea.innerHTML = '<p class="muted-text">Aucune carte n’est due pour le moment.</p>';
    return;
  }
  const card = due[0];
  els.reviewArea.innerHTML = `
    <div class="review-card">
      <p class="eyebrow">Révision</p>
      <h3>${card.prompt}</h3>
      <details><summary>Afficher le rappel</summary><p>${card.answer}</p></details>
      <div class="review-actions">
        <button class="primary-btn" data-review-score="easy" type="button">C’était fluide</button>
        <button class="secondary-btn" data-review-score="hard" type="button">À revoir</button>
      </div>
    </div>
  `;
  els.reviewArea.querySelectorAll('[data-review-score]').forEach((btn) => btn.addEventListener('click', () => {
    scoreReviewCard(state, card.id, btn.dataset.reviewScore);
    state.dailyProgress.reviewDoneToday += 1;
    refresh();
    startReviewSession();
  }));
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state = await importState(file);
    hydratePathwayProgress(state, pathways);
    populatePathwaySelect();
    refresh();
    showToast('Progression importée.');
  } catch {
    showToast('Import impossible. Vérifiez le fichier JSON.');
  }
}

function openModal(el, activeButton = null, message = '') {
  if (!el) return;
  el.classList.remove('hidden');
  document.body.classList.add('modal-open');
  activeModal = el;
  if (activeButton) highlightNav(activeButton);
  if (message) showToast(message);
}

function closeModal(el) {
  if (!el || el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  if (activeModal === el) activeModal = null;
  stopAllPlayers(el);
  if ([els.lessonModal, els.progressModal, els.challengeModal, els.dataModal].every((modal) => modal.classList.contains('hidden'))) {
    document.body.classList.remove('modal-open');
    highlightNav(els.homeBtn);
  }
}

function closeAllModals() {
  [els.lessonModal, els.progressModal, els.challengeModal, els.dataModal].forEach((modal) => closeModal(modal));
}

function highlightNav(activeButton) {
  [els.homeBtn, els.challengeBtn, els.progressBtn, els.dataBtn].forEach((btn) => btn.classList.toggle('active', btn === activeButton));
}

let toastTimer = null;
function showToast(message) {
  if (!message) return;
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 2200);
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}
