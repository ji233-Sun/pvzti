import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  buildAssessmentContext,
  buildChatCompletionsPayloads,
  prioritizePayloadVariantsForBaseUrl,
  parseAssessmentResult,
  createFallbackAssessmentResult,
  extractProviderErrorMessage,
} from "../lib/pvzti/assessment.ts";
import { plantOrder, plantProfiles } from "../lib/pvzti/plants.ts";
import {
  calculateBaseScores,
  validateQuestionBank,
} from "../lib/pvzti/scoring.ts";
import {
  clearQuizSession,
  createEmptyQuizSession,
  hasCompleteQuizAnswers,
  loadQuizSession,
  saveQuizSession,
} from "../lib/pvzti/quiz-session.ts";
import type {
  AssessmentResult,
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

function createMemoryStorage(initialValue?: string) {
  let storedValue = initialValue ?? null;

  return {
    getItem(key: string) {
      return key === "pvzti.quiz.session" ? storedValue : null;
    },
    setItem(key: string, value: string) {
      if (key === "pvzti.quiz.session") {
        storedValue = value;
      }
    },
    removeItem(key: string) {
      if (key === "pvzti.quiz.session") {
        storedValue = null;
      }
    },
  };
}

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
  assert.match(
    context.answerTranscript[0] ?? "",
    /第一题：面对新项目时，你通常先做什么？[\s\S]*用户选择：先把资源和士气都拉满，再稳步推进。/,
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

test("buildChatCompletionsPayloads creates a strict request and two compatibility fallbacks", () => {
  const summary = calculateBaseScores(mockQuestionBank, mockAnswers);
  const context = buildAssessmentContext({
    questionBank: mockQuestionBank,
    answers: mockAnswers,
    summary,
  });

  const payloads = buildChatCompletionsPayloads({
    context,
    model: "gpt-4.1-mini",
  });

  assert.equal(payloads.length, 3);
  assert.equal(payloads[0]?.label, "strict-json-schema");
  assert.equal(payloads[0]?.body.messages[0]?.role, "developer");
  assert.match(
    payloads[0]?.body.messages[0]?.content ?? "",
    /逐题阅读用户的题面与所选答案，并在评语中体现这些作答线索/,
  );
  assert.equal(payloads[0]?.body.response_format.type, "json_schema");
  assert.equal(payloads[0]?.body.max_completion_tokens, 900);
  assert.match(payloads[0]?.body.messages[1]?.content ?? "", /"answerTranscript": \[/);

  assert.equal(payloads[1]?.label, "compatible-json-object");
  assert.equal(payloads[1]?.body.messages[0]?.role, "system");
  assert.match(
    payloads[1]?.body.messages[0]?.content ?? "",
    /详细评语必须结合题面与所选答案，总结用户反复出现的偏好与行为模式/,
  );
  assert.equal(payloads[1]?.body.response_format.type, "json_object");
  assert.equal(payloads[1]?.body.max_tokens, 900);
  assert.equal("max_completion_tokens" in payloads[1]!.body, false);

  assert.equal(payloads[2]?.label, "compatible-plain-json");
  assert.equal(payloads[2]?.body.messages[0]?.role, "system");
  assert.equal("response_format" in payloads[2]!.body, false);
  assert.equal(payloads[2]?.body.max_tokens, 900);
});

test("extractProviderErrorMessage reads common OpenAI-compatible error payloads", () => {
  const errorMessage = extractProviderErrorMessage({
    error: {
      message: "Unsupported parameter: response_format.type=json_schema",
    },
  });

  assert.equal(errorMessage, "Unsupported parameter: response_format.type=json_schema");
});

test("prioritizePayloadVariantsForBaseUrl prefers compatible variants for DeepSeek", () => {
  const summary = calculateBaseScores(mockQuestionBank, mockAnswers);
  const context = buildAssessmentContext({
    questionBank: mockQuestionBank,
    answers: mockAnswers,
    summary,
  });

  const payloads = buildChatCompletionsPayloads({
    context,
    model: "deepseek-chat",
  });

  const prioritized = prioritizePayloadVariantsForBaseUrl(
    payloads,
    "https://api.deepseek.com/v1",
  );

  assert.equal(prioritized[0]?.label, "compatible-json-object");
  assert.equal(prioritized[1]?.label, "compatible-plain-json");
  assert.equal(prioritized[2]?.label, "strict-json-schema");
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

test("loadQuizSession falls back to an empty session when storage is empty or malformed", () => {
  const emptyStorage = createMemoryStorage();
  assert.deepEqual(loadQuizSession(emptyStorage), createEmptyQuizSession());

  const malformedStorage = createMemoryStorage("{bad json");
  assert.deepEqual(loadQuizSession(malformedStorage), createEmptyQuizSession());
});

test("saveQuizSession persists answers, progress, and result for later routes", () => {
  const storage = createMemoryStorage();
  const result: AssessmentResult = {
    scores: {
      peashooter: 18,
      sunflower: 86,
      wallnut: 64,
      potatoMine: 22,
      cabbagePult: 40,
      cherryBomb: 30,
    },
    leadingPlantId: "sunflower",
    detailedComment: "你擅长为团队补足能量。",
    playfulComment: "会发光的后勤 MVP。",
    source: "ai",
  };

  saveQuizSession(storage, {
    answers: mockAnswers,
    currentIndex: 1,
    result,
  });

  assert.deepEqual(loadQuizSession(storage), {
    answers: mockAnswers,
    currentIndex: 1,
    result,
  });

  clearQuizSession(storage);
  assert.deepEqual(loadQuizSession(storage), createEmptyQuizSession());
});

test("hasCompleteQuizAnswers requires every question id to be answered", () => {
  assert.equal(hasCompleteQuizAnswers(mockAnswers, mockQuestionBank.questions), true);
  assert.equal(hasCompleteQuizAnswers({ q1: "q1-o1" }, mockQuestionBank.questions), false);
});

test("quiz option cards do not render tone labels under the option copy", () => {
  const quizQuestionsSource = readFileSync(
    new URL("../components/pvzti/quiz-questions.tsx", import.meta.url),
    "utf8",
  );
  const quizExperienceSource = readFileSync(
    new URL("../components/pvzti/quiz-experience.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(quizQuestionsSource, /\{option\.tone\}/);
  assert.doesNotMatch(quizExperienceSource, /\{option\.tone\}/);
});
