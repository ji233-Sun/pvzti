import { plantIds } from "./types";
import type {
  AssessmentResult,
  Question,
  QuizAnswers,
} from "./types";

export const quizSessionStorageKey = "pvzti.quiz.session";

export type QuizSessionState = {
  answers: QuizAnswers;
  currentIndex: number;
  result: AssessmentResult | null;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlantId(value: unknown): value is (typeof plantIds)[number] {
  return typeof value === "string" && plantIds.includes(value as (typeof plantIds)[number]);
}

function sanitizeAnswers(value: unknown): QuizAnswers {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<QuizAnswers>((accumulator, [questionId, optionId]) => {
    if (typeof optionId === "string" && optionId.length > 0) {
      accumulator[questionId] = optionId;
    }

    return accumulator;
  }, {});
}

function sanitizeResult(value: unknown): AssessmentResult | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isPlantId(value.leadingPlantId) ||
    typeof value.detailedComment !== "string" ||
    typeof value.playfulComment !== "string" ||
    (value.source !== "ai" && value.source !== "fallback") ||
    !isRecord(value.scores)
  ) {
    return null;
  }

  const rawScores = value.scores;
  const scores = {} as AssessmentResult["scores"];

  for (const plantId of plantIds) {
    const score = rawScores[plantId];

    if (typeof score !== "number" || !Number.isFinite(score)) {
      return null;
    }

    scores[plantId] = score;
  }

  return {
    scores,
    leadingPlantId: value.leadingPlantId,
    detailedComment: value.detailedComment,
    playfulComment: value.playfulComment,
    source: value.source,
    ...(typeof value.notice === "string" ? { notice: value.notice } : {}),
  };
}

export function createEmptyQuizSession(): QuizSessionState {
  return {
    answers: {},
    currentIndex: 0,
    result: null,
  };
}

export function sanitizeQuizSession(value: unknown): QuizSessionState {
  if (!isRecord(value)) {
    return createEmptyQuizSession();
  }

  return {
    answers: sanitizeAnswers(value.answers),
    currentIndex:
      typeof value.currentIndex === "number" && Number.isInteger(value.currentIndex)
        ? Math.max(0, value.currentIndex)
        : 0,
    result: sanitizeResult(value.result),
  };
}

export function loadQuizSession(storage: StorageLike): QuizSessionState {
  const storedValue = storage.getItem(quizSessionStorageKey);

  if (!storedValue) {
    return createEmptyQuizSession();
  }

  try {
    return sanitizeQuizSession(JSON.parse(storedValue));
  } catch {
    return createEmptyQuizSession();
  }
}

export function saveQuizSession(storage: StorageLike, session: QuizSessionState) {
  storage.setItem(quizSessionStorageKey, JSON.stringify(sanitizeQuizSession(session)));
}

export function clearQuizSession(storage: StorageLike) {
  storage.removeItem(quizSessionStorageKey);
}

export function hasCompleteQuizAnswers(
  answers: QuizAnswers,
  questions: Pick<Question, "id">[],
) {
  return questions.every((question) => {
    const selectedOptionId = answers[question.id];
    return typeof selectedOptionId === "string" && selectedOptionId.length > 0;
  });
}
