import { createEmptyScores, plantOrder } from "./plants";
import {
  type BaseScoreSummary,
  type DimensionScores,
  type PlantId,
  type QuestionBank,
  type QuizAnswers,
} from "./types";

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getLeadingPlantId(scores: DimensionScores): PlantId {
  return plantOrder.reduce((best, candidate) => {
    if (scores[candidate] > scores[best]) {
      return candidate;
    }

    return best;
  }, plantOrder[0]);
}

export function validateQuestionBank(questionBank: QuestionBank) {
  if (questionBank.totalQuestions !== 20 || questionBank.questions.length !== 20) {
    throw new Error("PVZTI question bank must contain exactly 20 questions.");
  }

  const seenQuestionIds = new Set<string>();
  const seenOptionIds = new Set<string>();

  for (const question of questionBank.questions) {
    if (seenQuestionIds.has(question.id)) {
      throw new Error(`Duplicate question id: ${question.id}`);
    }

    seenQuestionIds.add(question.id);

    if (!question.prompt.trim()) {
      throw new Error(`Question ${question.id} is missing prompt text.`);
    }

    if (question.options.length !== 4) {
      throw new Error(`Question ${question.id} must contain exactly 4 options.`);
    }

    for (const option of question.options) {
      if (seenOptionIds.has(option.id)) {
        throw new Error(`Duplicate option id: ${option.id}`);
      }

      seenOptionIds.add(option.id);

      const hasPositiveScore = Object.values(option.scores).some(
        (value) => typeof value === "number" && value > 0,
      );

      if (!hasPositiveScore) {
        throw new Error(`Option ${option.id} must contribute to at least one plant.`);
      }
    }
  }
}

export function validateQuizAnswers(questionBank: QuestionBank, answers: QuizAnswers) {
  const missingQuestionIds: string[] = [];
  const invalidQuestionIds: string[] = [];

  for (const question of questionBank.questions) {
    const selectedOptionId = answers[question.id];

    if (!selectedOptionId) {
      missingQuestionIds.push(question.id);
      continue;
    }

    if (!question.options.some((option) => option.id === selectedOptionId)) {
      invalidQuestionIds.push(question.id);
    }
  }

  return {
    isValid: missingQuestionIds.length === 0 && invalidQuestionIds.length === 0,
    missingQuestionIds,
    invalidQuestionIds,
  };
}

export function calculateBaseScores(
  questionBank: QuestionBank,
  answers: QuizAnswers,
): BaseScoreSummary {
  const rawScores = createEmptyScores();
  const maxScores = createEmptyScores();
  let answeredCount = 0;

  for (const question of questionBank.questions) {
    const selectedOption = question.options.find(
      (option) => option.id === answers[question.id],
    );

    if (selectedOption) {
      answeredCount += 1;
    }

    for (const plantId of plantOrder) {
      const maxForQuestion = Math.max(
        ...question.options.map((option) => option.scores[plantId] ?? 0),
      );
      maxScores[plantId] += maxForQuestion;

      if (selectedOption) {
        rawScores[plantId] += selectedOption.scores[plantId] ?? 0;
      }
    }
  }

  const normalizedScores = plantOrder.reduce((scores, plantId) => {
    const maxScore = maxScores[plantId];
    scores[plantId] = maxScore === 0 ? 0 : roundScore((rawScores[plantId] / maxScore) * 100);
    return scores;
  }, createEmptyScores());

  return {
    rawScores,
    maxScores,
    normalizedScores,
    answeredCount,
    leadingPlantId: getLeadingPlantId(normalizedScores),
  };
}
