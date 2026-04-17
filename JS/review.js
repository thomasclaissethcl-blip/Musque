import { CONFIG } from './config.js';
import { todayISO } from './utils.js';

/**
 * Révision espacée légère.
 *
 * Exemple d'adaptation :
 * - en musique : front = idée à retenir, back = effet ou conduite
 * - en réglementation : front = situation, back = règle applicable
 */
export function seedReviewCardsFromLesson(state, lesson) {
  if (!lesson.keyPoints) return;

  lesson.keyPoints.forEach((point) => {
    const cardId = `${lesson.id}::${point.id}`;
    if (!state.review[cardId]) {
      state.review[cardId] = {
        id: cardId,
        lessonId: lesson.id,
        prompt: point.front,
        answer: point.back,
        nextReviewDate: todayISO(),
        intervalDays: CONFIG.review.initialIntervalDays,
      };
    }
  });
}

export function getDueReviewCards(state, selectedLessonIds = null) {
  const today = todayISO();
  return Object.values(state.review).filter((card) => {
    const inScope = !selectedLessonIds || selectedLessonIds.includes(card.lessonId);
    return inScope && card.nextReviewDate <= today;
  });
}

export function scoreReviewCard(state, cardId, quality) {
  const card = state.review[cardId];
  if (!card) return;

  if (quality === 'easy') {
    card.intervalDays = Math.max(1, Math.round(card.intervalDays * CONFIG.review.easyMultiplier));
  } else {
    card.intervalDays = CONFIG.review.hardIntervalDays;
  }

  const next = new Date();
  next.setDate(next.getDate() + card.intervalDays);
  card.nextReviewDate = next.toISOString().slice(0, 10);
}
