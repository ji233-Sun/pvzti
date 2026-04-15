import { NextResponse } from "next/server";

import { createFallbackAssessmentResult } from "@/lib/pvzti/assessment";
import { sanitizeQuestionBank } from "@/lib/pvzti/question-bank";
import { plantProfiles } from "@/lib/pvzti/plants";
import { calculateBaseScores, validateQuizAnswers } from "@/lib/pvzti/scoring";
import type { QuestionBank, QuizAnswers } from "@/lib/pvzti/types";

export const runtime = "nodejs";

function createJsonErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
  return NextResponse.json(
    createFallbackAssessmentResult({
      summary: baseSummary,
      profiles: plantProfiles,
    }),
  );
}
