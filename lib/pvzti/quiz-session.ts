import { defaultQuestionBank, sanitizeQuestionBank } from "./question-bank";
import { plantIds } from "./types";
import type {
  AiQuestionGenerationPrompt,
  AssessmentResult,
  Question,
  QuestionBank,
  QuizAnswers,
  QuizMode,
} from "./types";

export const quizSessionStorageKey = "pvzti.quiz.session";

export type QuizSessionState = {
  mode: QuizMode;
  questionBank: QuestionBank | null;
  generationPrompt: AiQuestionGenerationPrompt | null;
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

  const legacySource = value.source;
  const hasSupportedSource =
    legacySource === "rule" || legacySource === "ai" || legacySource === "fallback";

  if (
    !isPlantId(value.leadingPlantId) ||
    typeof value.detailedComment !== "string" ||
    typeof value.playfulComment !== "string" ||
    !hasSupportedSource ||
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
    source: "rule",
    ...(typeof value.notice === "string" ? { notice: value.notice } : {}),
  };
}

function sanitizeGenerationPrompt(value: unknown): AiQuestionGenerationPrompt | null {
  if (!isRecord(value)) {
    return null;
  }

  const scenario = typeof value.scenario === "string" ? value.scenario.trim() : "";
  const tone = typeof value.tone === "string" ? value.tone.trim() : "";
  const focus = typeof value.focus === "string" ? value.focus.trim() : "";

  if (!scenario || !tone || !focus) {
    return null;
  }

  return { scenario, tone, focus };
}

export function createEmptyQuizSession(): QuizSessionState {
  return {
    mode: "default",
    questionBank: null,
    generationPrompt: null,
    answers: {},
    currentIndex: 0,
    result: null,
  };
}

export function createDefaultQuizSession(): QuizSessionState {
  return {
    ...createEmptyQuizSession(),
    mode: "default",
    questionBank: defaultQuestionBank,
  };
}

export function createAiDraftQuizSession(
  generationPrompt: AiQuestionGenerationPrompt,
): QuizSessionState {
  return {
    ...createEmptyQuizSession(),
    mode: "ai-generated",
    generationPrompt,
  };
}

export function createAiQuizSession({
  questionBank,
  generationPrompt,
}: {
  questionBank: QuestionBank;
  generationPrompt: AiQuestionGenerationPrompt;
}): QuizSessionState {
  return {
    ...createEmptyQuizSession(),
    mode: "ai-generated",
    questionBank,
    generationPrompt,
  };
}

export function getActiveQuestionBank(session: QuizSessionState) {
  return session.questionBank;
}

export function sanitizeQuizSession(value: unknown): QuizSessionState {
  if (!isRecord(value)) {
    return createEmptyQuizSession();
  }

  return {
    mode: value.mode === "ai-generated" ? "ai-generated" : "default",
    questionBank: sanitizeQuestionBank(value.questionBank),
    generationPrompt: sanitizeGenerationPrompt(value.generationPrompt),
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
