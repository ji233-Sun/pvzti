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

const generationFallbackMessage = "AI 题库生成失败，请稍后重试。";

async function readGenerationResponse(response: Response): Promise<GenerationResponse> {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as GenerationResponse;
  } catch {
    return {};
  }
}

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

      try {
        const response = await fetch("/api/question-bank/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session.generationPrompt),
        });

        const payload = await readGenerationResponse(response);

        if (!response.ok || !payload.questionBank) {
          if (!cancelled) {
            setErrorMessage(payload.error ?? generationFallbackMessage);
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
      } catch {
        if (!cancelled) {
          setErrorMessage(generationFallbackMessage);
        }
      }
    }

    void generateQuestionBank();

    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-sm backdrop-blur sm:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs tracking-[0.24em] text-primary uppercase">
          AI智能出题
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          AI 正在替你生成一套全新题目
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
          这一步会根据你刚才填写的场景、表达风格和主题偏好生成 20 道题，完成后仍会映射到现有植物人格结果。
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
