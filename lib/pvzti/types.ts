export const plantIds = [
  "peashooter",
  "sunflower",
  "wallnut",
  "potatoMine",
  "cabbagePult",
  "cherryBomb",
] as const;

export type PlantId = (typeof plantIds)[number];

export type DimensionScores = Record<PlantId, number>;

export type QuestionOption = {
  id: string;
  label: string;
  tone: string;
  scores: Partial<Record<PlantId, number>>;
};

export type Question = {
  id: string;
  title: string;
  prompt: string;
  options: QuestionOption[];
};

export type QuestionBank = {
  version: string;
  totalQuestions: number;
  questions: Question[];
};

export type QuizAnswers = Record<string, string>;

export type BaseScoreSummary = {
  rawScores: DimensionScores;
  maxScores: DimensionScores;
  normalizedScores: DimensionScores;
  answeredCount: number;
  leadingPlantId: PlantId;
};

export type PlantProfile = {
  id: PlantId;
  name: string;
  archetype: string;
  tagline: string;
  description: string;
  strengths: string[];
  watchouts: string[];
  bias: string[];
};

export type AnswerSummary = {
  questionId: string;
  title: string;
  prompt: string;
  selectedOptionId: string;
  selectedOptionLabel: string;
  selectedTone: string;
  selectedScores: Partial<Record<PlantId, number>>;
};

export type AssessmentContext = {
  leadingPlantId: PlantId;
  rawScores: DimensionScores;
  baseScores: DimensionScores;
  answers: AnswerSummary[];
  answerTranscript: string[];
  plants: PlantProfile[];
};

export type AssessmentResult = {
  scores: DimensionScores;
  leadingPlantId: PlantId;
  detailedComment: string;
  playfulComment: string;
  source: "ai" | "fallback";
  notice?: string;
};
