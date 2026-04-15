# PVZTI AI 智能出题模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `AI智能出题` mode that collects three lightweight user preferences, generates a valid 20-question PVZTI question bank, and reuses the existing quiz, loading, and result flow with the active session question bank.

**Architecture:** Extend `QuizSessionState` so every run carries its own active `QuestionBank`, mode, and optional generation prompt. Add a dedicated question-bank generation API plus `/quiz/ai` and `/quiz/ai/generating` pages, then refit `/quiz/questions`, `/quiz/loading`, `/quiz/result`, and `/api/assessment` to consume the session’s active bank instead of the global default bank.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript 5, Tailwind CSS 4, shadcn/ui-style primitives, OpenAI-compatible chat completions API, `node:test` via `tsx --test`.

---

> Repository constraint: do **not** add git commit steps. The repo instructions explicitly say not to plan git operations unless the user asks.

## File Structure Map

**Create**

- `app/quiz/ai/page.tsx` - metadata page for the AI question-bank configuration form.
- `app/quiz/ai/generating/page.tsx` - metadata page for the AI question-bank generation loading/failure state.
- `app/api/question-bank/generate/route.ts` - server route that validates prompt input, calls the OpenAI-compatible provider, and returns a validated `QuestionBank`.
- `components/pvzti/quiz-ai-config.tsx` - client form for `scenario`, `tone`, and `focus`.
- `components/pvzti/quiz-ai-generating.tsx` - client page that reads the saved AI prompt, requests a question bank, handles retry/fallback-to-standard actions, and seeds session state.
- `components/ui/input.tsx` - shared text input primitive for the AI config form.
- `components/ui/textarea.tsx` - shared multiline input primitive for the AI config form.
- `lib/pvzti/question-bank-generation.ts` - prompt validation, payload building, and response parsing for AI-generated question banks.

**Modify**

- `lib/pvzti/types.ts` - add quiz mode and AI prompt types.
- `lib/pvzti/question-bank.ts` - rename/export the default static bank and add question-bank sanitization helpers.
- `lib/pvzti/quiz-session.ts` - extend session shape and add helpers for default mode, AI draft mode, AI generated mode, and active question-bank resolution.
- `app/api/assessment/route.ts` - require `questionBank` in the request body and compute scores from the active bank.
- `components/pvzti/quiz-landing.tsx` - add standard-vs-AI mode entry points and continue-session routing.
- `components/pvzti/quiz-questions.tsx` - load the active bank from session instead of the static import.
- `components/pvzti/quiz-loading.tsx` - submit `{ questionBank, answers }` and use the active bank for completeness checks and index bookkeeping.
- `components/pvzti/quiz-result.tsx` - use the active bank for redirect logic and show the current mode label.
- `tests/pvzti.test.ts` - extend unit tests and add lightweight source-level regression tests for the new shared-flow wiring.

## Task 1: Extend Session State Around an Active Question Bank

**Files:**
- Modify: `lib/pvzti/types.ts`
- Modify: `lib/pvzti/question-bank.ts`
- Modify: `lib/pvzti/quiz-session.ts`
- Test: `tests/pvzti.test.ts`

- [ ] **Step 1: Write the failing tests for the new session shape and helpers**

Add these imports near the existing `quiz-session` imports in `tests/pvzti.test.ts`:

```ts
import { defaultQuestionBank } from "../lib/pvzti/question-bank.ts";
import {
  clearQuizSession,
  createAiDraftQuizSession,
  createAiQuizSession,
  createDefaultQuizSession,
  createEmptyQuizSession,
  getActiveQuestionBank,
  hasCompleteQuizAnswers,
  loadQuizSession,
  saveQuizSession,
  sanitizeQuizSession,
} from "../lib/pvzti/quiz-session.ts";
```

Append these tests after the existing session tests:

```ts
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
```

- [ ] **Step 2: Run the test file and verify the new tests fail**

Run:

```bash
npm test
```

Expected: FAIL with missing exports such as `createDefaultQuizSession`, `createAiDraftQuizSession`, `createAiQuizSession`, or `getActiveQuestionBank`, and possibly missing `mode` / `questionBank` / `generationPrompt` properties on `QuizSessionState`.

- [ ] **Step 3: Implement the minimal type and session helpers**

Update `lib/pvzti/types.ts` with the new prompt and mode types:

```ts
export type QuizMode = "default" | "ai-generated";

export type AiQuestionGenerationPrompt = {
  scenario: string;
  tone: string;
  focus: string;
};
```

Update `lib/pvzti/question-bank.ts` so the static bank is explicitly the default bank and unknown values can be sanitized:

```ts
import rawQuestionBank from "./questions.json";
import { validateQuestionBank } from "./scoring";
import type { QuestionBank } from "./types";

export const defaultQuestionBank = rawQuestionBank as QuestionBank;

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
```

Extend `lib/pvzti/quiz-session.ts` with the expanded session shape and helpers:

```ts
import { defaultQuestionBank, sanitizeQuestionBank } from "./question-bank";
import type {
  AiQuestionGenerationPrompt,
  AssessmentResult,
  Question,
  QuestionBank,
  QuizAnswers,
  QuizMode,
} from "./types";

export type QuizSessionState = {
  mode: QuizMode;
  questionBank: QuestionBank | null;
  generationPrompt: AiQuestionGenerationPrompt | null;
  answers: QuizAnswers;
  currentIndex: number;
  result: AssessmentResult | null;
};

function sanitizeGenerationPrompt(value: unknown): AiQuestionGenerationPrompt | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const scenario = typeof value.scenario === "string" ? value.scenario.trim() : "";
  const tone = typeof value.tone === "string" ? value.tone.trim() : "";
  const focus = typeof value.focus === "string" ? value.focus.trim() : "";

  if (!scenario || !tone || !focus) {
    return null;
  }

  return { scenario, tone, focus };
}

export function createEmptyQuizSession(): QuizSessionState {
  return {
    mode: "default",
    questionBank: null,
    generationPrompt: null,
    answers: {},
    currentIndex: 0,
    result: null,
  };
}

export function createDefaultQuizSession(): QuizSessionState {
  return {
    ...createEmptyQuizSession(),
    mode: "default",
    questionBank: defaultQuestionBank,
  };
}

export function createAiDraftQuizSession(
  generationPrompt: AiQuestionGenerationPrompt,
): QuizSessionState {
  return {
    ...createEmptyQuizSession(),
    mode: "ai-generated",
    generationPrompt,
  };
}

export function createAiQuizSession({
  questionBank,
  generationPrompt,
}: {
  questionBank: QuestionBank;
  generationPrompt: AiQuestionGenerationPrompt;
}): QuizSessionState {
  return {
    ...createEmptyQuizSession(),
    mode: "ai-generated",
    questionBank,
    generationPrompt,
  };
}

export function getActiveQuestionBank(session: QuizSessionState) {
  return session.questionBank;
}

export function sanitizeQuizSession(value: unknown): QuizSessionState {
  if (!isRecord(value)) {
    return createEmptyQuizSession();
  }

  return {
    mode: value.mode === "ai-generated" ? "ai-generated" : "default",
    questionBank: sanitizeQuestionBank(value.questionBank),
    generationPrompt: sanitizeGenerationPrompt(value.generationPrompt),
    answers: sanitizeAnswers(value.answers),
    currentIndex:
      typeof value.currentIndex === "number" && Number.isInteger(value.currentIndex)
        ? Math.max(0, value.currentIndex)
        : 0,
    result: sanitizeResult(value.result),
  };
}
```

- [ ] **Step 4: Run the test file again and verify the new tests pass**

Run:

```bash
npm test
```

Expected: PASS for the four new session tests, with no regression in the existing scoring, assessment, or storage tests.

## Task 2: Add AI Question-Bank Prompt Validation and Generation Route

**Files:**
- Create: `lib/pvzti/question-bank-generation.ts`
- Create: `app/api/question-bank/generate/route.ts`
- Test: `tests/pvzti.test.ts`

- [ ] **Step 1: Write the failing tests for AI prompt validation and route-level request validation**

Add these imports near the top of `tests/pvzti.test.ts`:

```ts
import { POST as generateQuestionBankPost } from "../app/api/question-bank/generate/route.ts";
import {
  buildQuestionBankGenerationPayloads,
  parseGeneratedQuestionBank,
  validateAiQuestionGenerationPrompt,
} from "../lib/pvzti/question-bank-generation.ts";
```

Append these tests:

```ts
test("validateAiQuestionGenerationPrompt trims valid input and rejects empty fields", () => {
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

test("buildQuestionBankGenerationPayloads builds a strict json-schema request", () => {
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

test("parseGeneratedQuestionBank rejects invalid generated json", () => {
  const parsed = parseGeneratedQuestionBank(
    JSON.stringify({ version: "broken", totalQuestions: 1, questions: [] }),
  );

  assert.equal(parsed, null);
});

test("question bank generation route rejects a request with missing fields", async () => {
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
```

- [ ] **Step 2: Run the test file and verify the new tests fail**

Run:

```bash
npm test
```

Expected: FAIL with missing module errors for `question-bank-generation.ts` or missing exports for `validateAiQuestionGenerationPrompt`, `buildQuestionBankGenerationPayloads`, `parseGeneratedQuestionBank`, and missing route module `app/api/question-bank/generate/route.ts`.

- [ ] **Step 3: Implement the generation helper module and the new route**

Create `lib/pvzti/question-bank-generation.ts`:

```ts
import { plantIds, type AiQuestionGenerationPrompt } from "./types";
import { sanitizeQuestionBank } from "./question-bank";

type ChatCompletionsBody = {
  model: string;
  temperature: number;
  messages: Array<{
    role: "developer" | "system" | "user";
    content: string;
  }>;
  max_completion_tokens?: number;
  max_tokens?: number;
  response_format?:
    | { type: "json_object" }
    | {
        type: "json_schema";
        json_schema: {
          name: string;
          strict: boolean;
          schema: Record<string, unknown>;
        };
      };
};

export type QuestionBankGenerationPayloadVariant = {
  label: "strict-json-schema" | "compatible-json-object" | "compatible-plain-json";
  body: ChatCompletionsBody;
};

export function validateAiQuestionGenerationPrompt(input: unknown) {
  if (typeof input !== "object" || input === null) {
    return { isValid: false as const, error: "请求体必须包含题目场景、表达风格和关系主题。" };
  }

  const scenario = typeof input.scenario === "string" ? input.scenario.trim() : "";
  const tone = typeof input.tone === "string" ? input.tone.trim() : "";
  const focus = typeof input.focus === "string" ? input.focus.trim() : "";

  if (!scenario) {
    return { isValid: false as const, error: "题目场景不能为空。" };
  }

  if (!tone) {
    return { isValid: false as const, error: "表达风格不能为空。" };
  }

  if (!focus) {
    return { isValid: false as const, error: "希望偏重的关系/主题不能为空。" };
  }

  if (scenario.length > 80 || tone.length > 40 || focus.length > 80) {
    return { isValid: false as const, error: "AI 出题配置超出长度限制。" };
  }

  return {
    isValid: true as const,
    prompt: { scenario, tone, focus } satisfies AiQuestionGenerationPrompt,
  };
}

export function buildQuestionBankGenerationPayloads({
  prompt,
  model,
}: {
  prompt: AiQuestionGenerationPrompt;
  model: string;
}): QuestionBankGenerationPayloadVariant[] {
  const strictSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      version: { type: "string" },
      totalQuestions: { type: "number", const: 20 },
      questions: {
        type: "array",
        minItems: 20,
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            prompt: { type: "string" },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  tone: { type: "string" },
                  scores: {
                    type: "object",
                    additionalProperties: false,
                    properties: Object.fromEntries(
                      plantIds.map((plantId) => [plantId, { type: "number", minimum: 0 }]),
                    ),
                  },
                },
                required: ["id", "label", "tone", "scores"],
              },
            },
          },
          required: ["id", "title", "prompt", "options"],
        },
      },
    },
    required: ["version", "totalQuestions", "questions"],
  };

  const userPrompt = JSON.stringify(prompt, null, 2);
  const sharedInstruction =
    "你要为 PVZTI 生成 20 道题、每题 4 个选项的植物人格题库，必须继续使用 peashooter、sunflower、wallnut、potatoMine、cabbagePult、cherryBomb 这 6 个维度，不允许改结果体系。";

  return [
    {
      label: "strict-json-schema",
      body: {
        model,
        temperature: 0.9,
        max_completion_tokens: 2200,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pvzti_generated_question_bank",
            strict: true,
            schema: strictSchema,
          },
        },
        messages: [
          {
            role: "developer",
            content: `${sharedInstruction}\n输出必须是严格合法的 JSON，且总题数固定为 20。`,
          },
          {
            role: "user",
            content: `请根据以下配置生成题库：\n${userPrompt}`,
          },
        ],
      },
    },
    {
      label: "compatible-json-object",
      body: {
        model,
        temperature: 0.9,
        max_tokens: 2200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${sharedInstruction}\n只输出 JSON，不要输出 Markdown。`,
          },
          {
            role: "user",
            content: `请根据以下配置生成题库：\n${userPrompt}`,
          },
        ],
      },
    },
    {
      label: "compatible-plain-json",
      body: {
        model,
        temperature: 0.9,
        max_tokens: 2200,
        messages: [
          {
            role: "system",
            content: `${sharedInstruction}\n只输出 JSON，不要输出 Markdown。`,
          },
          {
            role: "user",
            content: `请根据以下配置生成题库：\n${userPrompt}`,
          },
        ],
      },
    },
  ];
}

export function parseGeneratedQuestionBank(rawText: string) {
  try {
    return sanitizeQuestionBank(JSON.parse(rawText));
  } catch {
    return null;
  }
}
```

Create `app/api/question-bank/generate/route.ts`:

```ts
import { NextResponse } from "next/server";

import {
  extractChatCompletionText,
  extractProviderErrorMessage,
  prioritizePayloadVariantsForBaseUrl,
} from "@/lib/pvzti/assessment";
import {
  buildQuestionBankGenerationPayloads,
  parseGeneratedQuestionBank,
  validateAiQuestionGenerationPrompt,
} from "@/lib/pvzti/question-bank-generation";

export const runtime = "nodejs";

function createJsonErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return createJsonErrorResponse("请求体不是合法的 JSON。", 400);
  }

  const promptValidation = validateAiQuestionGenerationPrompt(payload);

  if (!promptValidation.isValid) {
    return createJsonErrorResponse(promptValidation.error, 400);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );

  if (!apiKey) {
    return createJsonErrorResponse("未配置 OPENAI_API_KEY，无法生成 AI 题库。", 503);
  }

  const payloadVariants = prioritizePayloadVariantsForBaseUrl(
    buildQuestionBankGenerationPayloads({
      prompt: promptValidation.prompt,
      model,
    }),
    baseUrl,
  );

  let lastFailureMessage = "AI 题库生成失败，请稍后重试。";

  for (const variant of payloadVariants) {
    const completionResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(variant.body),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    if (!completionResponse.ok) {
      const completionErrorPayload = (await completionResponse.json().catch(() => null)) as
        | unknown
        | null;
      lastFailureMessage =
        extractProviderErrorMessage(completionErrorPayload) ??
        `AI 题库生成请求失败（${completionResponse.status}）。`;
      continue;
    }

    const completionPayload = (await completionResponse.json()) as unknown;
    const generatedQuestionBank = parseGeneratedQuestionBank(
      extractChatCompletionText(completionPayload),
    );

    if (!generatedQuestionBank) {
      lastFailureMessage = `AI 已返回内容，但 ${variant.label} 的题库结构不合法。`;
      continue;
    }

    return NextResponse.json({ questionBank: generatedQuestionBank });
  }

  return createJsonErrorResponse(lastFailureMessage, 502);
}
```

- [ ] **Step 4: Run the test file again and verify the new route/prompt tests pass**

Run:

```bash
npm test
```

Expected: PASS for the four new generation tests, including the route-level 400 case for a missing `scenario`.

## Task 3: Change the Assessment Route Contract to Use the Active Question Bank

**Files:**
- Modify: `app/api/assessment/route.ts`
- Test: `tests/pvzti.test.ts`

- [ ] **Step 1: Write the failing tests for the new assessment request shape**

Add this import near the top of `tests/pvzti.test.ts`:

```ts
import { POST as postAssessment } from "../app/api/assessment/route.ts";
```

Append these tests:

```ts
test("assessment route rejects requests without a valid question bank", async () => {
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

test("assessment route calculates fallback results from the provided question bank", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const response = await postAssessment(
      new Request("http://localhost/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionBank: mockQuestionBank, answers: mockAnswers }),
      }),
    );

    assert.equal(response.status, 200);

    const payload = (await response.json()) as AssessmentResult & { notice?: string };
    assert.equal(payload.leadingPlantId, "sunflower");
    assert.match(payload.notice ?? "", /OPENAI_API_KEY/);
  } finally {
    if (previousApiKey) {
      process.env.OPENAI_API_KEY = previousApiKey;
    }
  }
});
```

- [ ] **Step 2: Run the test file and verify the new assessment route tests fail**

Run:

```bash
npm test
```

Expected: FAIL because the route still accepts only `{ answers }`, still reads the static `questionBank`, and therefore cannot reject missing dynamic banks or honor the provided bank in the request payload.

- [ ] **Step 3: Update `app/api/assessment/route.ts` to require `questionBank`**

Replace the request parsing and score setup with this shape:

```ts
import { sanitizeQuestionBank } from "@/lib/pvzti/question-bank";
import type { QuestionBank, QuizAnswers } from "@/lib/pvzti/types";

export async function POST(request: Request) {
  let answers: QuizAnswers | undefined;
  let inputQuestionBank: QuestionBank | null = null;

  try {
    const payload = (await request.json()) as {
      questionBank?: unknown;
      answers?: QuizAnswers;
    };
    answers = payload.answers;
    inputQuestionBank = sanitizeQuestionBank(payload.questionBank);
  } catch {
    return createJsonErrorResponse("请求体不是合法的 JSON。", 400);
  }

  if (!inputQuestionBank) {
    return createJsonErrorResponse("缺少合法题库。", 400);
  }

  if (!answers || typeof answers !== "object") {
    return createJsonErrorResponse("缺少测评答案。", 400);
  }

  const answerValidation = validateQuizAnswers(inputQuestionBank, answers);

  if (!answerValidation.isValid) {
    return createJsonErrorResponse(
      `答案不完整或无效。缺失题目：${answerValidation.missingQuestionIds.join(", ") || "无"}；无效题目：${answerValidation.invalidQuestionIds.join(", ") || "无"}`,
      400,
    );
  }

  const baseSummary = calculateBaseScores(inputQuestionBank, answers);
  const assessmentContext = buildAssessmentContext({
    questionBank: inputQuestionBank,
    answers,
    summary: baseSummary,
  });
```

Keep the rest of the AI/fallback logic intact so only the input contract changes.

- [ ] **Step 4: Run the test file again and verify the assessment route tests pass**

Run:

```bash
npm test
```

Expected: PASS for the two new assessment route tests, with the rest of the existing assessment tests still green.

## Task 4: Add the AI Entry Flow, Form Components, and Generating Screen

**Files:**
- Create: `components/ui/input.tsx`
- Create: `components/ui/textarea.tsx`
- Create: `components/pvzti/quiz-ai-config.tsx`
- Create: `components/pvzti/quiz-ai-generating.tsx`
- Create: `app/quiz/ai/page.tsx`
- Create: `app/quiz/ai/generating/page.tsx`
- Modify: `components/pvzti/quiz-landing.tsx`
- Test: `tests/pvzti.test.ts`

- [ ] **Step 1: Write source-level regression tests for the new AI entry flow**

Append these tests:

```ts
test("quiz landing exposes both standard and ai entry points", () => {
  const source = readFileSync(
    new URL("../components/pvzti/quiz-landing.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /标准题库/);
  assert.match(source, /AI智能出题/);
  assert.match(source, /router\\.push\\(\"\\/quiz\\/ai\"\\)/);
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

  assert.match(source, /\\/api\\/question-bank\\/generate/);
  assert.match(source, /重新生成/);
  assert.match(source, /切回标准题库/);
});
```

- [ ] **Step 2: Run the test file and verify the new entry-flow tests fail**

Run:

```bash
npm test
```

Expected: FAIL because the new route files and `QuizAiConfig` / `QuizAiGenerating` components do not exist yet, and `quiz-landing.tsx` does not route to `/quiz/ai`.

- [ ] **Step 3: Create the UI primitives, AI pages, and landing entry points**

Create `components/ui/input.tsx`:

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-3xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
```

Create `components/ui/textarea.tsx`:

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
```

Create `components/pvzti/quiz-ai-config.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createAiDraftQuizSession, saveQuizSession } from "@/lib/pvzti/quiz-session";

export function QuizAiConfig() {
  const router = useRouter();
  const [scenario, setScenario] = useState("");
  const [tone, setTone] = useState("");
  const [focus, setFocus] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPrompt = {
      scenario: scenario.trim(),
      tone: tone.trim(),
      focus: focus.trim(),
    };

    if (!nextPrompt.scenario || !nextPrompt.tone || !nextPrompt.focus) {
      setErrorMessage("请先填写完整的 AI 出题配置。");
      return;
    }

    saveQuizSession(window.sessionStorage, createAiDraftQuizSession(nextPrompt));
    router.push("/quiz/ai/generating");
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-sm">
      <div className="max-w-3xl">
        <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs tracking-[0.24em] text-primary uppercase">
          AI智能出题
        </div>
        <h1 className="mt-6 text-4xl font-semibold text-foreground">先告诉 AI 你想测什么氛围</h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          你填 3 条偏好，AI 会据此生成一套新的 20 题，但最后仍然回到 PVZTI 的 6 个植物人格结果。
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">题目场景</label>
          <Textarea
            maxLength={80}
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            placeholder="例如：校园社团、合租生活、创业团队、朋友旅行"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">表达风格</label>
          <Input
            maxLength={40}
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            placeholder="例如：轻松一点、有梗但别太油"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">希望偏重的关系/主题</label>
          <Textarea
            maxLength={80}
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            placeholder="例如：合作分工、冲突处理、机会判断、亲密关系"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg">
            开始生成题目
            <Sparkles />
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.push("/quiz")}>
            <ArrowLeft />
            返回模式选择
          </Button>
        </div>
      </form>
    </section>
  );
}
```

Create `components/pvzti/quiz-ai-generating.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createAiQuizSession,
  createDefaultQuizSession,
  loadQuizSession,
  saveQuizSession,
} from "@/lib/pvzti/quiz-session";
import type { QuestionBank } from "@/lib/pvzti/types";

type GenerationResponse = {
  questionBank?: QuestionBank;
  error?: string;
};

export function QuizAiGenerating() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function generateQuestionBank() {
      const session = loadQuizSession(window.sessionStorage);

      if (!session.generationPrompt) {
        router.replace("/quiz/ai");
        return;
      }

      setErrorMessage(null);

      const response = await fetch("/api/question-bank/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session.generationPrompt),
      });

      const payload = (await response.json()) as GenerationResponse;

      if (!response.ok || !payload.questionBank) {
        if (!cancelled) {
          setErrorMessage(payload.error ?? "AI 题库生成失败，请稍后重试。");
        }
        return;
      }

      if (cancelled) {
        return;
      }

      saveQuizSession(
        window.sessionStorage,
        createAiQuizSession({
          questionBank: payload.questionBank,
          generationPrompt: session.generationPrompt,
        }),
      );
      router.replace("/quiz/questions");
    }

    void generateQuestionBank();

    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-sm">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs tracking-[0.24em] text-primary uppercase">
          AI智能出题
        </div>
        <h1 className="mt-6 text-4xl font-semibold text-foreground">AI 正在替你生成一套全新题目</h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          这一步会根据你刚才填写的场景、表达风格和主题偏好生成 20 道新题，完成后仍会映射到现有植物人格结果。
        </p>

        <div className="mt-10 rounded-[2rem] border border-border/70 bg-background/80 p-8">
          {errorMessage ? (
            <div className="space-y-6">
              <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" onClick={() => setAttempt((previous) => previous + 1)}>
                  <RefreshCcw />
                  重新生成
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    saveQuizSession(window.sessionStorage, createDefaultQuizSession());
                    router.push("/quiz/questions");
                  }}
                >
                  切回标准题库
                  <Sparkles />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className="flex size-18 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <LoaderCircle className="size-9 animate-spin" />
                </div>
              </div>
              <p className="text-lg font-medium text-foreground">正在编排你的专属 20 题</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
```

Create `app/quiz/ai/page.tsx`:

```tsx
import type { Metadata } from "next";

import { QuizAiConfig } from "@/components/pvzti/quiz-ai-config";

export const metadata: Metadata = {
  title: "AI 智能出题",
  description: "配置你的题目场景、表达风格和关系主题，生成一套新的 PVZTI 题库。",
};

export default function QuizAiPage() {
  return <QuizAiConfig />;
}
```

Create `app/quiz/ai/generating/page.tsx`:

```tsx
import type { Metadata } from "next";

import { QuizAiGenerating } from "@/components/pvzti/quiz-ai-generating";

export const metadata: Metadata = {
  title: "AI 题库生成中",
  description: "PVZTI 正在根据你的偏好生成一套新的植物人格题库。",
};

export default function QuizAiGeneratingPage() {
  return <QuizAiGenerating />;
}
```

Refit the landing entry buttons in `components/pvzti/quiz-landing.tsx`:

```tsx
import {
  createDefaultQuizSession,
  getActiveQuestionBank,
  loadQuizSession,
  saveQuizSession,
} from "@/lib/pvzti/quiz-session";

function startStandardQuiz() {
  saveQuizSession(window.sessionStorage, createDefaultQuizSession());
  router.push("/quiz/questions");
}

function continueQuiz() {
  const session = loadQuizSession(window.sessionStorage);

  if (session.mode === "ai-generated" && session.generationPrompt && !getActiveQuestionBank(session)) {
    router.push("/quiz/ai/generating");
    return;
  }

  if (session.result) {
    router.push("/quiz/result");
    return;
  }

  if (getActiveQuestionBank(session)) {
    router.push("/quiz/questions");
    return;
  }

  router.push("/quiz");
}
```

Render the new AI button in the main action group:

```tsx
<div className="mt-10 flex flex-wrap gap-3">
  <Button size="lg" onClick={startStandardQuiz}>
    标准题库
    <ArrowRight />
  </Button>
  <Button size="lg" variant="outline" onClick={() => router.push("/quiz/ai")}>
    AI智能出题
    <Sparkles />
  </Button>
  <Button size="lg" variant="ghost" onClick={continueQuiz}>
    继续当前进度
    <RefreshCcw />
  </Button>
</div>
```

- [ ] **Step 4: Run the test file again and verify the AI entry-flow tests pass**

Run:

```bash
npm test
```

Expected: PASS for the three new source-level tests and no regressions in the earlier backend/session tests.

## Task 5: Refit the Shared Quiz Runtime to Consume the Active Session Question Bank

**Files:**
- Modify: `components/pvzti/quiz-questions.tsx`
- Modify: `components/pvzti/quiz-loading.tsx`
- Modify: `components/pvzti/quiz-result.tsx`
- Test: `tests/pvzti.test.ts`

- [ ] **Step 1: Write source-level tests that guard the shared runtime refactor**

Append these tests:

```ts
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

  assert.doesNotMatch(quizQuestionsSource, /import \\{ questionBank \\} from/);
  assert.doesNotMatch(quizLoadingSource, /import \\{ questionBank \\} from/);
  assert.doesNotMatch(quizResultSource, /import \\{ questionBank \\} from/);
});
```

- [ ] **Step 2: Run the test file and verify the runtime refactor test fails**

Run:

```bash
npm test
```

Expected: FAIL because all three shared runtime components still import the static `questionBank`.

- [ ] **Step 3: Update the shared runtime components to read the active bank from session**

In `components/pvzti/quiz-questions.tsx`, replace the static import and hydration logic with the session helper:

```tsx
import {
  clearQuizSession,
  createEmptyQuizSession,
  getActiveQuestionBank,
  loadQuizSession,
  saveQuizSession,
} from "@/lib/pvzti/quiz-session";

const { session } = sessionState;
const activeQuestionBank = getActiveQuestionBank(session);

if (!activeQuestionBank) {
  clearQuizSession(window.sessionStorage);
  router.replace("/quiz");
  return createHydrationPlaceholder();
}

const currentQuestion = activeQuestionBank.questions[session.currentIndex];
const totalQuestions = activeQuestionBank.questions.length;
```

Use `totalQuestions` everywhere the component currently uses `questionBank.questions.length`.

In `components/pvzti/quiz-loading.tsx`, pass the active bank to the assessment route:

```tsx
import { getActiveQuestionBank, loadQuizSession, saveQuizSession } from "@/lib/pvzti/quiz-session";
import type { AssessmentResult, QuestionBank, QuizAnswers } from "@/lib/pvzti/types";

async function requestAssessment(questionBank: QuestionBank, answers: QuizAnswers) {
  const requestKey = JSON.stringify({ questionBank, answers });

  if (inflightAssessmentRequest?.key === requestKey) {
    return inflightAssessmentRequest.promise;
  }

  const promise = (async () => {
    const response = await fetch("/api/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionBank, answers }),
    });
```

Then inside `generateResult()`:

```tsx
const activeQuestionBank = getActiveQuestionBank(session);

if (!activeQuestionBank) {
  router.replace("/quiz");
  return;
}

if (!hasCompleteQuizAnswers(session.answers, activeQuestionBank.questions)) {
  router.replace("/quiz/questions");
  return;
}

const result = await requestAssessment(activeQuestionBank, session.answers);

saveQuizSession(window.sessionStorage, {
  ...session,
  currentIndex: activeQuestionBank.questions.length - 1,
  result,
});
```

In `components/pvzti/quiz-result.tsx`, use the active bank and show the mode label:

```tsx
import { getActiveQuestionBank } from "@/lib/pvzti/quiz-session";

useEffect(() => {
  const nextSession = loadQuizSession(window.sessionStorage);
  const activeQuestionBank = getActiveQuestionBank(nextSession);

  if (!activeQuestionBank) {
    router.replace("/quiz");
    return;
  }

  if (nextSession.result) {
    queueMicrotask(() => {
      setSession(nextSession);
    });
    return;
  }

  if (hasCompleteQuizAnswers(nextSession.answers, activeQuestionBank.questions)) {
    router.replace("/quiz/loading");
    return;
  }

  router.replace("/quiz/questions");
}, [router]);
```

Add the source label card:

```tsx
<div className="text-sm text-muted-foreground">当前题目来源</div>
<div className="mt-2 text-base font-medium text-foreground">
  {session.mode === "ai-generated" ? "AI智能出题" : "标准题库"}
</div>
```

- [ ] **Step 4: Run the test file again and verify the shared runtime test passes**

Run:

```bash
npm test
```

Expected: PASS for the new source-level runtime test, plus the previously added backend and session tests.

## Task 6: Final Verification Across Tests, Lint, and Build

**Files:**
- Modify as needed: any of the files above if verification exposes compile-time or lint-level issues
- Verify: `tests/pvzti.test.ts`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS with all session, generation, assessment, and source-level regression tests green.

- [ ] **Step 2: Run ESLint across the repository**

Run:

```bash
npm run lint
```

Expected: PASS with zero ESLint errors.

- [ ] **Step 3: Run a production build**

Run:

```bash
npm run build
```

Expected: PASS with the new `/quiz/ai`, `/quiz/ai/generating`, and `/api/question-bank/generate` routes compiling successfully under Next.js 16.

- [ ] **Step 4: If any verification step fails, fix the smallest issue and rerun only the failed command before moving on**

Use this loop:

```bash
npm test
npm run lint
npm run build
```

Expected: all three commands exit with code `0` before the task is considered done.
