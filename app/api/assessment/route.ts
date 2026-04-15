import { NextResponse } from "next/server";

import {
  buildAssessmentContext,
  buildChatCompletionsPayloads,
  createFallbackAssessmentResult,
  extractChatCompletionText,
  extractProviderErrorMessage,
  parseAssessmentResult,
  prioritizePayloadVariantsForBaseUrl,
} from "@/lib/pvzti/assessment";
import { sanitizeQuestionBank } from "@/lib/pvzti/question-bank";
import { plantProfiles } from "@/lib/pvzti/plants";
import { calculateBaseScores, validateQuizAnswers } from "@/lib/pvzti/scoring";
import type { QuestionBank, QuizAnswers } from "@/lib/pvzti/types";

export const runtime = "nodejs";

function createJsonErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeProviderErrorMessage(rawText: string) {
  try {
    return extractProviderErrorMessage(JSON.parse(rawText));
  } catch {
    return extractProviderErrorMessage(rawText);
  }
}

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

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );

  if (!apiKey) {
    return NextResponse.json({
      ...createFallbackAssessmentResult({
        summary: baseSummary,
        profiles: plantProfiles,
      }),
      notice: "未配置 OPENAI_API_KEY，当前展示的是规则降级结果。",
    });
  }

  try {
    const payloadVariants = prioritizePayloadVariantsForBaseUrl(
      buildChatCompletionsPayloads({
        context: assessmentContext,
        model,
      }),
      baseUrl,
    );
    let lastFailureNotice = "AI 请求失败，已自动降级。";

    for (const variant of payloadVariants) {
      const completionResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(variant.body),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });

      if (!completionResponse.ok) {
        const errorText = await completionResponse.text();
        const providerMessage = normalizeProviderErrorMessage(errorText);
        const details = providerMessage ? ` ${providerMessage}` : "";

        lastFailureNotice = `AI 请求失败，已自动降级。状态码 ${completionResponse.status}，请求模式 ${variant.label}。${details}`.trim();

        if (
          (completionResponse.status === 400 || completionResponse.status === 422) &&
          variant !== payloadVariants[payloadVariants.length - 1]
        ) {
          continue;
        }

        return NextResponse.json({
          ...createFallbackAssessmentResult({
            summary: baseSummary,
            profiles: plantProfiles,
          }),
          notice: lastFailureNotice,
        });
      }

      const completionPayload = (await completionResponse.json()) as unknown;
      const rawText = extractChatCompletionText(completionPayload);
      const assessmentResult = parseAssessmentResult({
        rawText,
        fallbackSummary: baseSummary,
      });

      if (assessmentResult.source === "fallback") {
        lastFailureNotice = `AI 已返回内容，但格式不符合预期，已从 ${variant.label} 降级为规则结果。`;
        continue;
      }

      return NextResponse.json(assessmentResult);
    }

    return NextResponse.json({
      ...createFallbackAssessmentResult({
        summary: baseSummary,
        profiles: plantProfiles,
      }),
      notice: lastFailureNotice,
    });
  } catch {
    return NextResponse.json({
      ...createFallbackAssessmentResult({
        summary: baseSummary,
        profiles: plantProfiles,
      }),
      notice: "AI 评分调用超时或异常，当前展示的是规则降级结果。",
    });
  }
}
