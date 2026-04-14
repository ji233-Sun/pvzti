import rawQuestionBank from "./questions.json";
import { validateQuestionBank } from "./scoring";
import type { QuestionBank } from "./types";

export const questionBank = rawQuestionBank as QuestionBank;

validateQuestionBank(questionBank);
