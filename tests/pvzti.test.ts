import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  prioritizePayloadVariantsForBaseUrl,
  createFallbackAssessmentResult,
  extractProviderErrorMessage,
} from "../lib/pvzti/assessment.ts";
import { defaultQuestionBank } from "../lib/pvzti/question-bank.ts";
import { plantOrder, plantProfiles } from "../lib/pvzti/plants.ts";
import {
  calculateBaseScores,
  validateQuestionBank,
} from "../lib/pvzti/scoring.ts";
import {
  clearQuizSession,
  createAiDraftQuizSession,
  createAiQuizSession,
  createDefaultQuizSession,
  createEmptyQuizSession,
  getActiveQuestionBank,
  getContinueQuizPath,
  hasCompleteQuizAnswers,
  loadQuizSession,
  saveQuizSession,
  sanitizeQuizSession,
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

test("extractProviderErrorMessage reads common OpenAI-compatible error payloads", () => {
  const errorMessage = extractProviderErrorMessage({
    error: {
      message: "Unsupported parameter: response_format.type=json_schema",
    },
  });

  assert.equal(errorMessage, "Unsupported parameter: response_format.type=json_schema");
});

test("prioritizePayloadVariantsForBaseUrl prefers compatible variants for DeepSeek", () => {
  const payloads = [
    {
      label: "strict-json-schema" as const,
      body: { model: "deepseek-chat", temperature: 0.7, messages: [] },
    },
    {
      label: "compatible-json-object" as const,
      body: { model: "deepseek-chat", temperature: 0.7, messages: [] },
    },
    {
      label: "compatible-plain-json" as const,
      body: { model: "deepseek-chat", temperature: 0.7, messages: [] },
    },
  ];

  const prioritized = prioritizePayloadVariantsForBaseUrl(
    payloads,
    "https://api.deepseek.com/v1",
  );

  assert.equal(prioritized[0]?.label, "compatible-json-object");
  assert.equal(prioritized[1]?.label, "compatible-plain-json");
  assert.equal(prioritized[2]?.label, "strict-json-schema");
});

test("createFallbackAssessmentResult returns a rule-based result from normalized scores", () => {
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
  assert.deepEqual(fallback.scores, {
    peashooter: 20,
    sunflower: 90,
    wallnut: 40,
    potatoMine: 10,
    cabbagePult: 30,
    cherryBomb: 20,
  });
  assert.match(fallback.detailedComment, /向日葵/);
  assert.match(fallback.playfulComment, /向日葵/);
  assert.equal(fallback.source, "rule");
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
    source: "rule",
  };

  const session = {
    ...createDefaultQuizSession(),
    answers: mockAnswers,
    currentIndex: 1,
    result,
  };

  saveQuizSession(storage, session);

  assert.deepEqual(loadQuizSession(storage), session);

  clearQuizSession(storage);
  assert.deepEqual(loadQuizSession(storage), createEmptyQuizSession());
});

test("hasCompleteQuizAnswers requires every question id to be answered", () => {
  assert.equal(hasCompleteQuizAnswers(mockAnswers, mockQuestionBank.questions), true);
  assert.equal(hasCompleteQuizAnswers({ q1: "q1-o1" }, mockQuestionBank.questions), false);
});

test("createDefaultQuizSession seeds the default bank and default mode", () => {
  const session = createDefaultQuizSession();

  assert.equal(session.mode, "default");
  assert.equal(session.generationPrompt, null);
  assert.equal(session.questionBank?.questions.length, 20);
  assert.equal(getActiveQuestionBank(session)?.version, defaultQuestionBank.version);
});

test("createAiDraftQuizSession stores generation prompt without answers or result", () => {
  const session = createAiDraftQuizSession({
    scenario: "宿舍和朋友一起策划活动",
    tone: "轻松一点",
    focus: "合作分工",
  });

  assert.equal(session.mode, "ai-generated");
  assert.equal(session.questionBank, null);
  assert.deepEqual(session.answers, {});
  assert.equal(session.result, null);
  assert.equal(session.generationPrompt?.focus, "合作分工");
});

test("createAiQuizSession writes the generated bank and resets progress", () => {
  const session = createAiQuizSession({
    questionBank: mockQuestionBank,
    generationPrompt: {
      scenario: "校园社团",
      tone: "轻巧",
      focus: "关系互动",
    },
  });

  assert.equal(session.mode, "ai-generated");
  assert.equal(session.questionBank?.version, "test-v1");
  assert.equal(session.currentIndex, 0);
  assert.deepEqual(session.answers, {});
  assert.equal(session.result, null);
});

test("getContinueQuizPath only returns a route when a resumable session exists", () => {
  assert.equal(getContinueQuizPath(createEmptyQuizSession()), null);
  assert.equal(
    getContinueQuizPath(
      createAiDraftQuizSession({
        scenario: "校园社团",
        tone: "轻巧",
        focus: "关系互动",
      }),
    ),
    "/quiz/ai/generating",
  );
  assert.equal(getContinueQuizPath(createDefaultQuizSession()), "/quiz/questions");
  assert.equal(
    getContinueQuizPath({
      ...createDefaultQuizSession(),
      result: {
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
        source: "rule",
      },
    }),
    "/quiz/result",
  );
});

test("sanitizeQuizSession drops invalid question banks and invalid generation prompts", () => {
  const sanitized = sanitizeQuizSession({
    mode: "not-a-real-mode",
    questionBank: { version: "broken", totalQuestions: 1, questions: [] },
    generationPrompt: { scenario: "ok", tone: 1, focus: "ok" },
    answers: { q1: "q1-o1" },
    currentIndex: 4,
    result: null,
  });

  assert.equal(sanitized.mode, "default");
  assert.equal(sanitized.questionBank, null);
  assert.equal(sanitized.generationPrompt, null);
  assert.equal(sanitized.currentIndex, 4);
  assert.deepEqual(sanitized.answers, { q1: "q1-o1" });
});

test("validateAiQuestionGenerationPrompt trims valid input and rejects empty fields", async () => {
  const { validateAiQuestionGenerationPrompt } = await import(
    "../lib/pvzti/question-bank-generation.ts"
  );

  const valid = validateAiQuestionGenerationPrompt({
    scenario: "  校园社团协作  ",
    tone: "  有点幽默  ",
    focus: "  关系互动  ",
  });

  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.prompt, {
    scenario: "校园社团协作",
    tone: "有点幽默",
    focus: "关系互动",
  });

  const invalid = validateAiQuestionGenerationPrompt({
    scenario: "   ",
    tone: "轻松",
    focus: "合作",
  });

  assert.equal(invalid.isValid, false);
  assert.match(invalid.error ?? "", /题目场景/);
});

test("buildQuestionBankGenerationPayloads builds a strict json-schema request", async () => {
  const { buildQuestionBankGenerationPayloads } = await import(
    "../lib/pvzti/question-bank-generation.ts"
  );

  const payloads = buildQuestionBankGenerationPayloads({
    prompt: {
      scenario: "校园社团协作",
      tone: "轻松一点",
      focus: "关系互动",
    },
    model: "gpt-4.1-mini",
  });

  assert.equal(payloads.length, 3);
  assert.equal(payloads[0]?.label, "strict-json-schema");
  assert.equal(payloads[0]?.body.response_format?.type, "json_schema");
  assert.match(payloads[0]?.body.messages[1]?.content ?? "", /校园社团协作/);
  assert.match(payloads[0]?.body.messages[1]?.content ?? "", /关系互动/);
});

test("parseGeneratedQuestionBank rejects invalid generated json", async () => {
  const { parseGeneratedQuestionBank } = await import(
    "../lib/pvzti/question-bank-generation.ts"
  );

  const parsed = parseGeneratedQuestionBank(
    JSON.stringify({ version: "broken", totalQuestions: 1, questions: [] }),
  );

  assert.equal(parsed, null);
});

test("question bank generation route rejects a request with missing fields", async () => {
  const { POST: generateQuestionBankPost } = await import(
    "../app/api/question-bank/generate/route.ts"
  );

  const response = await generateQuestionBankPost(
    new Request("http://localhost/api/question-bank/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tone: "轻松一点", focus: "关系互动" }),
    }),
  );

  assert.equal(response.status, 400);
  assert.match(await response.text(), /题目场景/);
});

test("assessment route rejects requests without a valid question bank", async () => {
  const { POST: postAssessment } = await import("../app/api/assessment/route.ts");

  const response = await postAssessment(
    new Request("http://localhost/api/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: mockAnswers }),
    }),
  );

  assert.equal(response.status, 400);
  assert.match(await response.text(), /题库/);
});

test("assessment route returns rule-based results without calling AI scoring", async () => {
  const { POST: postAssessment } = await import("../app/api/assessment/route.ts");
  const previousApiKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  let fetchCallCount = 0;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    fetchCallCount += 1;
    return previousFetch(...args);
  }) as typeof fetch;

  const customQuestionBank: QuestionBank = {
    ...defaultQuestionBank,
    version: "custom-test-v1",
    questions: defaultQuestionBank.questions.map((question, questionIndex) => {
      const nextQuestionId = `custom-q${String(questionIndex + 1).padStart(2, "0")}`;

      return {
        ...question,
        id: nextQuestionId,
        options: question.options.map((option, optionIndex) => ({
          ...option,
          id: `${nextQuestionId}-${String.fromCharCode(97 + optionIndex)}`,
        })),
      };
    }),
  };
  const customAnswers = Object.fromEntries(
    customQuestionBank.questions.map((question) => [question.id, question.options[0]!.id]),
  ) as QuizAnswers;

  try {
    const response = await postAssessment(
      new Request("http://localhost/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionBank: customQuestionBank, answers: customAnswers }),
      }),
    );

    assert.equal(response.status, 200);

    const payload = (await response.json()) as AssessmentResult & { notice?: string };
    assert.equal(payload.source, "rule");
    assert.equal(payload.notice, undefined);
    assert.equal(fetchCallCount, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey) {
      process.env.OPENAI_API_KEY = previousApiKey;
      return;
    }

    delete process.env.OPENAI_API_KEY;
  }
});

test("quiz landing exposes both standard and ai entry points", () => {
  const source = readFileSync(
    new URL("../components/pvzti/quiz-landing.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /标准题库/);
  assert.match(source, /AI智能出题/);
  assert.match(source, /router\.push\(\"\/quiz\/ai\"\)/);
  assert.match(source, /disabled=\{!continueQuizPath\}/);
  assert.doesNotMatch(source, /AI 详细评语/);
  assert.doesNotMatch(source, /二次评估/);
});

test("ai quiz routes render the dedicated config and generating components", () => {
  const configPageSource = readFileSync(
    new URL("../app/quiz/ai/page.tsx", import.meta.url),
    "utf8",
  );
  const generatingPageSource = readFileSync(
    new URL("../app/quiz/ai/generating/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(configPageSource, /QuizAiConfig/);
  assert.match(generatingPageSource, /QuizAiGenerating/);
});

test("ai generating screen requests the question-bank generation route and offers standard fallback", () => {
  const source = readFileSync(
    new URL("../components/pvzti/quiz-ai-generating.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/api\/question-bank\/generate/);
  assert.match(source, /重新生成/);
  assert.match(source, /切回标准题库/);
});

test("quiz runtime screens resolve the active question bank from session helpers", () => {
  const quizQuestionsSource = readFileSync(
    new URL("../components/pvzti/quiz-questions.tsx", import.meta.url),
    "utf8",
  );
  const quizLoadingSource = readFileSync(
    new URL("../components/pvzti/quiz-loading.tsx", import.meta.url),
    "utf8",
  );
  const quizResultSource = readFileSync(
    new URL("../components/pvzti/quiz-result.tsx", import.meta.url),
    "utf8",
  );

  assert.match(quizQuestionsSource, /getActiveQuestionBank/);
  assert.match(quizLoadingSource, /questionBank:/);
  assert.match(quizResultSource, /当前题目来源|mode === "ai-generated"/);

  assert.doesNotMatch(quizQuestionsSource, /import \{ questionBank \} from/);
  assert.doesNotMatch(quizLoadingSource, /import \{ questionBank \} from/);
  assert.doesNotMatch(quizResultSource, /import \{ questionBank \} from/);
  assert.doesNotMatch(quizResultSource, /AI 增强评分|规则降级结果/);
});

test("quiz result page merges short and long commentary into one review card", () => {
  const quizResultSource = readFileSync(
    new URL("../components/pvzti/quiz-result.tsx", import.meta.url),
    "utf8",
  );

  assert.match(quizResultSource, />评语</);
  assert.match(quizResultSource, /<blockquote[\s\S]*result\.playfulComment/);
  assert.match(quizResultSource, /result\.detailedComment/);
  assert.doesNotMatch(quizResultSource, /详细评语/);
  assert.doesNotMatch(quizResultSource, /俏皮短评/);
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
