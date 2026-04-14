import { NextResponse } from "next/server";

import {
  buildAssessmentContext,
  buildChatCompletionsPayload,
  createFallbackAssessmentResult,
  extractChatCompletionText,
  parseAssessmentResult,
} from "@/lib/pvzti/assessment";
import { questionBank } from "@/lib/pvzti/question-bank";
import { plantProfiles } from "@/lib/pvzti/plants";
import { calculateBaseScores, validateQuizAnswers } from "@/lib/pvzti/scoring";
import type { QuizAnswers } from "@/lib/pvzti/types";

export const runtime = "nodejs";

function createJsonErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let answers: QuizAnswers | undefined;

  try {
    const payload = (await request.json()) as { answers?: QuizAnswers };
    answers = payload.answers;
  } catch {
    return createJsonErrorResponse("请求体不是合法的 JSON。", 400);
  }

  if (!answers || typeof answers !== "object") {
    return createJsonErrorResponse("缺少测评答案。", 400);
  }

  const answerValidation = validateQuizAnswers(questionBank, answers);

  if (!answerValidation.isValid) {
    return createJsonErrorResponse(
      `答案不完整或无效。缺失题目：${answerValidation.missingQuestionIds.join(", ") || "无"}；无效题目：${answerValidation.invalidQuestionIds.join(", ") || "无"}`,
      400,
    );
  }

  const baseSummary = calculateBaseScores(questionBank, answers);
  const assessmentContext = buildAssessmentContext({
    questionBank,
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
    const completionResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(
        buildChatCompletionsPayload({
          context: assessmentContext,
          model,
        }),
      ),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!completionResponse.ok) {
      return NextResponse.json({
        ...createFallbackAssessmentResult({
          summary: baseSummary,
          profiles: plantProfiles,
        }),
        notice: `AI 请求失败，已自动降级。状态码 ${completionResponse.status}。`,
      });
    }

    const completionPayload = (await completionResponse.json()) as unknown;
    const rawText = extractChatCompletionText(completionPayload);
    const assessmentResult = parseAssessmentResult({
      rawText,
      fallbackSummary: baseSummary,
    });

    if (assessmentResult.source === "fallback") {
      return NextResponse.json({
        ...assessmentResult,
        notice: "AI 已返回内容，但格式不符合预期，已自动降级为规则结果。",
      });
    }

    return NextResponse.json(assessmentResult);
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
