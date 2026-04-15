import rawQuestionBank from "./questions.json";
import { validateQuestionBank } from "./scoring";
import type { QuestionBank } from "./types";

export const defaultQuestionBank = rawQuestionBank as QuestionBank;
export const questionBank = defaultQuestionBank;

validateQuestionBank(defaultQuestionBank);

export function sanitizeQuestionBank(value: unknown): QuestionBank | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  try {
    const questionBank = value as QuestionBank;
    validateQuestionBank(questionBank);
    return questionBank;
  } catch {
    return null;
  }
}
