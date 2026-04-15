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
    const questionBank = parseGeneratedQuestionBank(
      extractChatCompletionText(completionPayload),
    );

    if (!questionBank) {
      lastFailureMessage = `AI 已返回内容，但 ${variant.label} 的题库结构不合法。`;
      continue;
    }

    return NextResponse.json({ questionBank });
  }

  return createJsonErrorResponse(lastFailureMessage, 502);
}
