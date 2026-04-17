import { CONFIG } from './config.js';
import { todayISO } from './utils.js';

/**
 * Calcul de progression.
 *
 * Exemple d'adaptation :
 * - un produit conformité, maintenance ou management peut réemployer
 *   exactement la même logique de progression, XP et série quotidienne
 */
export function hydratePathwayProgress(state, pathways) {
  pathways.forEach((pathway) => {
    if (!state.pathwayProgress[pathway.id]) {
      state.pathwayProgress[pathway.id] = { completedLessonIds: [] };
    }
  });
}

export function refreshDailyProgress(state) {
  const today = todayISO();
  if (state.dailyProgress.date !== today) {
    state.dailyProgress = {
      date: today,
      lessonsCompletedToday: 0,
      reviewDoneToday: 0,
      quizDoneToday: 0,
    };
  }
}

export function computeLevel(state) {
  state.profile.level = Math.floor(state.profile.xp / CONFIG.xp.levelStep) + 1;
}

export function awardXP(state, amount, reason) {
  state.profile.xp += amount;
  computeLevel(state);
  state.profile.history.unshift({ date: new Date().toISOString(), amount, reason });
  state.profile.history = state.profile.history.slice(0, 60);
}

export function updateStreak(state) {
  const today = todayISO();
  const last = state.profile.lastStudyDate;
  if (!last) {
    state.profile.streak = 1;
  } else {
    const lastDate = new Date(last);
    const current = new Date(today);
    const diffDays = Math.round((current - lastDate) / 86400000);
    if (diffDays === 1) state.profile.streak += 1;
    else if (diffDays > 1) state.profile.streak = 1;
  }
  state.profile.lastStudyDate = today;
}

export function completeLesson(state, lesson) {
  if (!state.profile.completedLessons.includes(lesson.id)) {
    state.profile.completedLessons.push(lesson.id);
    awardXP(state, CONFIG.xp.lessonCompletion, `Capsule validée : ${lesson.title}`);
    state.dailyProgress.lessonsCompletedToday += 1;
    updateStreak(state);
  }

  lesson.pathways?.forEach((pathway) => {
    const progress = state.pathwayProgress[pathway.id];
    if (progress && !progress.completedLessonIds.includes(lesson.id)) {
      progress.completedLessonIds.push(lesson.id);
    }
  });
}

export function decorateLessons(lessons, state) {
  return lessons.map((lesson) => {
    const completed = state.profile.completedLessons.includes(lesson.id);
    const exerciseCount = lesson.exercises?.length || 0;

    let locked = false;
    let currentStage = 'decouverte';

    if (state.learningMode === 'pathway' && state.selectedPathway) {
      const pathInfo = lesson.pathways?.find((path) => path.id === state.selectedPathway);
      if (pathInfo) {
        currentStage = pathInfo.stage;
        const previousOrder = pathInfo.order - 1;
        if (previousOrder > 0) {
          const previousLesson = lessons.find((candidate) => candidate.pathways?.some((path) => path.id === state.selectedPathway && path.order === previousOrder));
          locked = !!previousLesson && !state.profile.completedLessons.includes(previousLesson.id);
        }
      }
    }

    return {
      ...lesson,
      completed,
      locked,
      currentStage,
      exerciseCount,
      typeLabel: lesson.typeLabel || lesson.type,
    };
  });
}
