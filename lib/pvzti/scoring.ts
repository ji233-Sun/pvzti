import type { Dimensions, QuestionBank, QuizAnswers, PlantPersonality } from "./types";
import { dimensionKeys } from "./types";
import { euclideanDistance } from "./dimensions";

export function calculateDimensions(
  bank: QuestionBank,
  answers: QuizAnswers
): Dimensions {
  const raw: Dimensions = { edge: 0, resonance: 0, order: 0, tenacity: 0, bond: 0 };
  const max: Dimensions = { edge: 0, resonance: 0, order: 0, tenacity: 0, bond: 0 };

  for (const question of bank.questions) {
    const selectedId = answers[question.id];
    const selected = question.options.find((o) => o.id === selectedId);

    const questionMax: Dimensions = { edge: 0, resonance: 0, order: 0, tenacity: 0, bond: 0 };
    for (const option of question.options) {
      for (const key of dimensionKeys) {
        const val = option.scores[key] ?? 0;
        if (val > questionMax[key]) questionMax[key] = val;
      }
    }

    for (const key of dimensionKeys) {
      max[key] += questionMax[key];
      if (selected) raw[key] += selected.scores[key] ?? 0;
    }
  }

  const normalized: Dimensions = { edge: 0, resonance: 0, order: 0, tenacity: 0, bond: 0 };
  for (const key of dimensionKeys) {
    normalized[key] = max[key] > 0 ? Math.round((raw[key] / max[key]) * 100) : 50;
    normalized[key] = Math.max(0, Math.min(100, normalized[key]));
  }

  return normalized;
}

export function findMatchingPlant(
  userDimensions: Dimensions,
  plants: PlantPersonality[]
): PlantPersonality {
  let bestDist = Infinity;
  let candidates: PlantPersonality[] = [];

  for (const plant of plants) {
    const dist = euclideanDistance(userDimensions, plant.dimensions);
    if (dist < bestDist) {
      bestDist = dist;
      candidates = [plant];
    } else if (dist === bestDist) {
      candidates.push(plant);
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}
