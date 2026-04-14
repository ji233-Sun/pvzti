import { plantProfiles, plantProfilesById } from "./plants";
import { getLeadingPlantId } from "./scoring";
import { plantIds, type AssessmentContext, type AssessmentResult, type BaseScoreSummary, type PlantProfile, type QuestionBank, type QuizAnswers } from "./types";

export function buildAssessmentContext({
  questionBank,
  answers,
  summary,
}: {
  questionBank: QuestionBank;
  answers: QuizAnswers;
  summary: BaseScoreSummary;
}): AssessmentContext {
  const answerSummaries = questionBank.questions.flatMap((question) => {
    const selectedOption = question.options.find((option) => option.id === answers[question.id]);

    if (!selectedOption) {
      return [];
    }

    return [
      {
        questionId: question.id,
        title: question.title,
        prompt: question.prompt,
        selectedOptionId: selectedOption.id,
        selectedOptionLabel: selectedOption.label,
        selectedTone: selectedOption.tone,
        selectedScores: selectedOption.scores,
      },
    ];
  });

  return {
    leadingPlantId: summary.leadingPlantId,
    rawScores: summary.rawScores,
    baseScores: summary.normalizedScores,
    answers: answerSummaries,
    plants: plantProfiles,
  };
}

export function buildChatCompletionsPayload({
  context,
  model,
}: {
  context: AssessmentContext;
  model: string;
}) {
  return {
    model,
    temperature: 0.7,
    max_completion_tokens: 900,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pvzti_assessment_result",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            scores: {
              type: "object",
              additionalProperties: false,
              properties: Object.fromEntries(
                plantIds.map((plantId) => [
                  plantId,
                  { type: "number", minimum: 0, maximum: 100 },
                ]),
              ),
              required: [...plantIds],
            },
            detailedComment: { type: "string" },
            playfulComment: { type: "string" },
          },
          required: ["scores", "detailedComment", "playfulComment"],
        },
      },
    },
    messages: [
      {
        role: "developer",
        content: [
          "你是 PVZTI 测评分析器。",
          "请根据用户已选答案、基础维度分数、六个植物的画像与属性偏向，为六个植物维度输出 0-100 的整数分。",
          "请把最终输出严格限制为 JSON，并符合给定 schema。",
          "最终的 detailedComment 与 playfulComment 必须只围绕最高分植物书写，不能混写多个植物人格。",
          "如果用户答案的语义与基础分数没有明显冲突，请尽量保持与基础分数接近，不要无理由颠覆。",
          "请用简洁但有画面感的中文输出。",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify(context, null, 2),
      },
    ],
  };
}

function clampAiScore(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function extractChatCompletionText(payload: unknown) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("choices" in payload) ||
    !Array.isArray(payload.choices)
  ) {
    return "";
  }

  const firstChoice = payload.choices[0];
  const content = firstChoice?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export function createFallbackAssessmentResult({
  summary,
  profiles,
}: {
  summary: BaseScoreSummary;
  profiles: PlantProfile[];
}): AssessmentResult {
  const leadingPlantId = summary.leadingPlantId;
  const profile =
    profiles.find((item) => item.id === leadingPlantId) ?? plantProfilesById[leadingPlantId];

  return {
    scores: summary.normalizedScores,
    leadingPlantId,
    detailedComment: [
      `你的答案整体更偏向「${profile.name}」维度。`,
      profile.description,
      `你通常会优先表现出 ${profile.strengths.slice(0, 2).join("、")} 这类特质。`,
      `当这种倾向被拉满时，也要留意 ${profile.watchouts.slice(0, 2).join("、")}。`,
    ].join(" "),
    playfulComment: `${profile.name}状态已上线：${profile.tagline}`,
    source: "fallback",
  };
}

export function parseAssessmentResult({
  rawText,
  fallbackSummary,
}: {
  rawText: string;
  fallbackSummary: BaseScoreSummary;
}): AssessmentResult {
  try {
    const parsed = JSON.parse(rawText) as {
      scores?: Record<string, unknown>;
      detailedComment?: unknown;
      playfulComment?: unknown;
    };

    if (
      typeof parsed.detailedComment !== "string" ||
      typeof parsed.playfulComment !== "string" ||
      typeof parsed.scores !== "object" ||
      parsed.scores === null
    ) {
      throw new Error("Missing assessment fields.");
    }

    const scores = plantIds.reduce((accumulator, plantId) => {
      const nextScore = clampAiScore(parsed.scores?.[plantId]);

      if (nextScore === null) {
        throw new Error(`Invalid score for ${plantId}`);
      }

      accumulator[plantId] = nextScore;
      return accumulator;
    }, {} as AssessmentResult["scores"]);

    return {
      scores,
      leadingPlantId: getLeadingPlantId(scores),
      detailedComment: parsed.detailedComment.trim(),
      playfulComment: parsed.playfulComment.trim(),
      source: "ai",
    };
  } catch {
    return createFallbackAssessmentResult({
      summary: fallbackSummary,
      profiles: plantProfiles,
    });
  }
}
