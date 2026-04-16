import type { PlantPersonality, QuestionBank } from "./types";
import plantDataJson from "./plant-data.json";
import questionBankJson from "./questions.json";

export const allPlants: PlantPersonality[] = plantDataJson as PlantPersonality[];

export const plantsById = new Map<string, PlantPersonality>(
  allPlants.map((p) => [p.id, p])
);

export function getPlant(id: string): PlantPersonality | undefined {
  return plantsById.get(id);
}

export const questionBank: QuestionBank = questionBankJson as QuestionBank;

export function proxyImage(url: string): string {
  if (!url) return "";
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
}
