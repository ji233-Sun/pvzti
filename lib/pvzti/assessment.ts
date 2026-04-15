import { plantProfilesById } from "./plants";
import type { AssessmentResult, BaseScoreSummary, PlantProfile } from "./types";

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

type ChatCompletionsPayloadVariant = {
  label: "strict-json-schema" | "compatible-json-object" | "compatible-plain-json";
  body: ChatCompletionsBody;
};

export function prioritizePayloadVariantsForBaseUrl(
  payloads: ChatCompletionsPayloadVariant[],
  baseUrl: string,
) {
  if (/deepseek\.com/i.test(baseUrl)) {
    const compatibleJsonObject = payloads.find(
      (payload) => payload.label === "compatible-json-object",
    );
    const compatiblePlainJson = payloads.find(
      (payload) => payload.label === "compatible-plain-json",
    );
    const strictJsonSchema = payloads.find(
      (payload) => payload.label === "strict-json-schema",
    );

    return [compatibleJsonObject, compatiblePlainJson, strictJsonSchema].filter(
      (payload): payload is ChatCompletionsPayloadVariant => Boolean(payload),
    );
  }

  return payloads;
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

export function extractProviderErrorMessage(payload: unknown) {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  if (
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message.trim();
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message.trim();
  }

  return "";
}

export function isUnsupportedResponseFormatError(message: string) {
  const normalizedMessage = message.trim().toLowerCase();

  return (
    normalizedMessage.includes("response_format") &&
    (normalizedMessage.includes("unsupported") || normalizedMessage.includes("unavailable"))
  );
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
    source: "rule",
  }
}
