export interface Dimensions {
  edge: number;
  resonance: number;
  order: number;
  tenacity: number;
  bond: number;
}

export interface PlantPersonality {
  id: string;
  name: string;
  image: string;
  catalog: string;
  skillIntro: string;
  labels: string[];
  professionIcon: string;
  personalityType: string;
  personalityBrief: string;
  personalityAnalysis: string;
  dimensions: Dimensions;
}

export interface QuestionOption {
  id: string;
  label: string;
  scores: Partial<Dimensions>;
}

export interface Question {
  id: string;
  prompt: string;
  options: QuestionOption[];
}

export interface QuestionBank {
  version: string;
  totalQuestions: number;
  questions: Question[];
}

export type QuizAnswers = Record<string, string>;

export type DimensionKey = keyof Dimensions;

export const dimensionKeys: DimensionKey[] = [
  "edge",
  "resonance",
  "order",
  "tenacity",
  "bond",
];
