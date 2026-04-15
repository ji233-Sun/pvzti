import { sanitizeQuestionBank } from "./question-bank";
import { plantIds, type AiQuestionGenerationPrompt } from "./types";

type ChatCompletionsBody = {
  model: string;
  temperature: number;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  max_completion_tokens?: number;
  max_tokens?: number;
  response_format?:
    | {
        type: "json_object";
      }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateAiQuestionGenerationPrompt(input: unknown) {
  if (!isRecord(input)) {
    return {
      isValid: false as const,
      error: "请求体必须包含题目场景、表达风格和关系主题。",
    };
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
    prompt: {
      scenario,
      tone,
      focus,
    } satisfies AiQuestionGenerationPrompt,
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

  const serializedPrompt = JSON.stringify(prompt, null, 2);
  const sharedInstruction =
    "你要为 PVZTI 生成 20 道题、每题 4 个选项的植物人格题库，继续使用 peashooter、sunflower、wallnut、potatoMine、cabbagePult、cherryBomb 这 6 个维度，不允许改结果体系。";

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
            role: "system",
            content: `${sharedInstruction}\n输出必须是严格合法的 JSON，且总题数固定为 20。`,
          },
          {
            role: "user",
            content: `请根据以下配置生成题库：\n${serializedPrompt}`,
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
            content: `请根据以下配置生成题库：\n${serializedPrompt}`,
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
            content: `请根据以下配置生成题库：\n${serializedPrompt}`,
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
