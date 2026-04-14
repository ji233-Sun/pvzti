import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  buildAssessmentContext,
  parseAssessmentResult,
  createFallbackAssessmentResult,
} from "../lib/pvzti/assessment.ts";
import { plantOrder, plantProfiles } from "../lib/pvzti/plants.ts";
import {
  calculateBaseScores,
  validateQuestionBank,
} from "../lib/pvzti/scoring.ts";
import type {
  DimensionScores,
  QuestionBank,
  QuizAnswers,
} from "../lib/pvzti/types.ts";

const mockQuestionBank: QuestionBank = {
  version: "test-v1",
  totalQuestions: 2,
  questions: [
    {
      id: "q1",
      title: "第一题",
      prompt: "面对新项目时，你通常先做什么？",
      options: [
        {
          id: "q1-o1",
          label: "先把资源和士气都拉满，再稳步推进。",
          tone: "资源型、稳定型",
          scores: {
            sunflower: 3,
            wallnut: 1,
          },
        },
        {
          id: "q1-o2",
          label: "先打前锋，边做边开路。",
          tone: "主动型、输出型",
          scores: {
            peashooter: 3,
            cherryBomb: 1,
          },
        },
      ],
    },
    {
      id: "q2",
      title: "第二题",
      prompt: "团队遇到混乱时，你更像谁？",
      options: [
        {
          id: "q2-o1",
          label: "先稳住阵脚，把风险挡在前面。",
          tone: "防御型、承压型",
          scores: {
            wallnut: 4,
            sunflower: 1,
          },
        },
        {
          id: "q2-o2",
          label: "静静观察，等最佳时机一招定局。",
          tone: "潜伏型、判断型",
          scores: {
            potatoMine: 4,
            cabbagePult: 1,
          },
        },
      ],
    },
  ],
};

const mockAnswers: QuizAnswers = {
  q1: "q1-o1",
  q2: "q2-o1",
};

test("question bank validator accepts a complete 20-question JSON bank", () => {
  const questionBank = JSON.parse(
    readFileSync(new URL("../lib/pvzti/questions.json", import.meta.url), "utf8"),
  ) as QuestionBank;

  assert.equal(questionBank.questions.length, 20);
  assert.doesNotThrow(() => validateQuestionBank(questionBank));
});

test("calculateBaseScores tallies raw scores and normalizes each plant dimension", () => {
  const summary = calculateBaseScores(mockQuestionBank, mockAnswers);

  const expectedRawScores: DimensionScores = {
    peashooter: 0,
    sunflower: 4,
    wallnut: 5,
    potatoMine: 0,
    cabbagePult: 0,
    cherryBomb: 0,
  };

  assert.deepEqual(summary.rawScores, expectedRawScores);
  assert.deepEqual(summary.maxScores, {
    peashooter: 3,
    sunflower: 4,
    wallnut: 5,
    potatoMine: 4,
    cabbagePult: 1,
    cherryBomb: 1,
  });
  assert.equal(summary.normalizedScores.sunflower, 100);
  assert.equal(summary.normalizedScores.wallnut, 100);
  assert.equal(summary.leadingPlantId, plantOrder[1]);
});

test("buildAssessmentContext includes selected answers, raw scores, and plant profiles", () => {
  const summary = calculateBaseScores(mockQuestionBank, mockAnswers);
  const context = buildAssessmentContext({
    questionBank: mockQuestionBank,
    answers: mockAnswers,
    summary,
  });

  assert.equal(context.leadingPlantId, "sunflower");
  assert.equal(context.answers.length, 2);
  assert.equal(
    context.answers[0]?.selectedOptionLabel,
    "先把资源和士气都拉满，再稳步推进。",
  );
  assert.equal(context.baseScores.wallnut, 100);
  assert.equal(context.plants[0]?.id, "peashooter");
  assert.equal(context.plants.at(-1)?.id, "cherryBomb");
});

test("parseAssessmentResult keeps AI scores when payload is valid", () => {
  const summary = calculateBaseScores(mockQuestionBank, mockAnswers);
  const aiResult = parseAssessmentResult({
    rawText: JSON.stringify({
      scores: {
        peashooter: 22,
        sunflower: 88,
        wallnut: 74,
        potatoMine: 20,
        cabbagePult: 36,
        cherryBomb: 18,
      },
      detailedComment: "你像向日葵一样，擅长把能量和秩序带进团队。",
      playfulComment: "你是会发光的后勤 MVP。",
    }),
    fallbackSummary: summary,
  });

  assert.equal(aiResult.source, "ai");
  assert.equal(aiResult.leadingPlantId, "sunflower");
  assert.equal(aiResult.scores.sunflower, 88);
});

test("createFallbackAssessmentResult bases both comments on the top plant", () => {
  const fallback = createFallbackAssessmentResult({
    summary: {
      rawScores: {
        peashooter: 2,
        sunflower: 9,
        wallnut: 4,
        potatoMine: 1,
        cabbagePult: 3,
        cherryBomb: 2,
      },
      maxScores: {
        peashooter: 10,
        sunflower: 10,
        wallnut: 10,
        potatoMine: 10,
        cabbagePult: 10,
        cherryBomb: 10,
      },
      normalizedScores: {
        peashooter: 20,
        sunflower: 90,
        wallnut: 40,
        potatoMine: 10,
        cabbagePult: 30,
        cherryBomb: 20,
      },
      answeredCount: 20,
      leadingPlantId: "sunflower",
    },
    profiles: plantProfiles,
  });

  assert.equal(fallback.leadingPlantId, "sunflower");
  assert.match(fallback.detailedComment, /向日葵/);
  assert.match(fallback.playfulComment, /向日葵/);
});
