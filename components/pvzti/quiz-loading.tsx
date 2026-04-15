"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, RefreshCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clearQuizSession,
  getActiveQuestionBank,
  hasCompleteQuizAnswers,
  loadQuizSession,
  saveQuizSession,
} from "@/lib/pvzti/quiz-session";
import type { AssessmentResult, QuestionBank, QuizAnswers } from "@/lib/pvzti/types";

type AssessmentPayload = AssessmentResult & { error?: string };

let inflightAssessmentRequest:
  | {
      key: string;
      promise: Promise<AssessmentResult>;
    }
  | null = null;

async function requestAssessment(questionBank: QuestionBank, answers: QuizAnswers) {
  const requestKey = JSON.stringify({ questionBank, answers });

  if (inflightAssessmentRequest?.key === requestKey) {
    return inflightAssessmentRequest.promise;
  }

  const promise = (async () => {
    const response = await fetch("/api/assessment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ questionBank, answers }),
    });

    const payload = (await response.json()) as AssessmentPayload;

    if (!response.ok) {
      throw new Error(payload.error ?? "测评结果生成失败，请稍后重试。");
    }

    return payload;
  })().finally(() => {
    if (inflightAssessmentRequest?.key === requestKey) {
      inflightAssessmentRequest = null;
    }
  });

  inflightAssessmentRequest = {
    key: requestKey,
    promise,
  };

  return promise;
}

export function QuizLoading() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function generateResult() {
      const session = loadQuizSession(window.sessionStorage);
      const activeQuestionBank = getActiveQuestionBank(session);

      if (session.result) {
        router.replace("/quiz/result");
        return;
      }

      if (!activeQuestionBank) {
        router.replace("/quiz");
        return;
      }

      if (!hasCompleteQuizAnswers(session.answers, activeQuestionBank.questions)) {
        router.replace("/quiz/questions");
        return;
      }

      setErrorMessage(null);

      try {
        const result = await requestAssessment(activeQuestionBank, session.answers);

        if (cancelled) {
          return;
        }

        saveQuizSession(window.sessionStorage, {
          ...session,
          currentIndex: activeQuestionBank.questions.length - 1,
          result,
        });
        router.replace("/quiz/result");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "测评结果生成失败，请稍后重试。",
        );
      }
    }

    void generateResult();

    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  function handleRetry() {
    setAttempt((previous) => previous + 1);
  }

  function handleBackToQuestions() {
    router.push("/quiz/questions");
  }

  function handleRestart() {
    clearQuizSession(window.sessionStorage);
    router.push("/quiz");
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-sm backdrop-blur sm:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs tracking-[0.24em] text-primary uppercase">
          结果生成中
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          AI 正在整理你的植物人格画像
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
          我们已经收到你全部 20 道题的答案，正在结合基础维度分数和植物画像生成最终评语。通常只需要几秒钟，请稍等片刻。
        </p>

        <div className="mt-10 rounded-[2rem] border border-border/70 bg-background/80 p-8">
          {errorMessage ? (
            <div className="space-y-6">
              <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" size="lg" onClick={handleBackToQuestions}>
                  <ArrowLeft />
                  返回题目
                </Button>
                <Button size="lg" onClick={handleRetry}>
                  <RefreshCcw />
                  再试一次
                </Button>
                <Button variant="outline" size="lg" onClick={handleRestart}>
                  重新开始
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
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">正在生成专属结果</p>
                <p className="text-sm leading-7 text-muted-foreground">
                  如果你的 AI 提供方响应稍慢，页面会保持在这里等待，不会丢失答题记录。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
