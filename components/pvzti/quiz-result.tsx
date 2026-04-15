"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, RefreshCcw, Sparkles } from "lucide-react";

import { plantThemeMap } from "@/components/pvzti/plant-theme";
import { Button } from "@/components/ui/button";
import { questionBank } from "@/lib/pvzti/question-bank";
import {
  clearQuizSession,
  hasCompleteQuizAnswers,
  loadQuizSession,
  saveQuizSession,
} from "@/lib/pvzti/quiz-session";
import type { QuizSessionState } from "@/lib/pvzti/quiz-session";
import { plantProfilesById, plantOrder } from "@/lib/pvzti/plants";
import { cn } from "@/lib/utils";

function createHydrationPlaceholder() {
  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        正在读取你的测评结果...
      </div>
    </section>
  );
}

export function QuizResult() {
  const router = useRouter();
  const [session, setSession] = useState<QuizSessionState | null>(null);

  useEffect(() => {
    const nextSession = loadQuizSession(window.sessionStorage);

    if (nextSession.result) {
      queueMicrotask(() => {
        setSession(nextSession);
      });
      return;
    }

    if (hasCompleteQuizAnswers(nextSession.answers, questionBank.questions)) {
      router.replace("/quiz/loading");
      return;
    }

    router.replace("/quiz");
  }, [router]);

  if (!session?.result) {
    return createHydrationPlaceholder();
  }

  const result = session.result;
  const leadingProfile = plantProfilesById[result.leadingPlantId];
  const leadingTheme = plantThemeMap[result.leadingPlantId];
  const rankedPlantIds = [...plantOrder].sort(
    (left, right) => result.scores[right] - result.scores[left],
  );

  function handleRestart() {
    clearQuizSession(window.sessionStorage);
    router.push("/quiz");
  }

  function handleReviewQuestions() {
    if (!session) {
      return;
    }

    const nextSession = {
      ...session,
      currentIndex: 0,
    };

    setSession(nextSession);
    saveQuizSession(window.sessionStorage, nextSession);
    router.push("/quiz/questions");
  }

  return (
    <section className="space-y-6">
      <div
        className={cn(
          "rounded-[2rem] border p-8 shadow-sm backdrop-blur sm:p-10",
          leadingTheme.surface,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <span
              className={cn(
                "inline-flex rounded-full border px-3 py-1 text-xs tracking-[0.24em] uppercase",
                leadingTheme.badge,
              )}
            >
              结果已生成
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              你的 PVZTI 主属性是「{leadingProfile.name}」
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              {leadingProfile.description}
            </p>
          </div>

          <div className="min-w-52 rounded-[1.5rem] border border-border/70 bg-background/85 p-5">
            <div className="text-sm text-muted-foreground">结果来源</div>
            <div className="mt-2 flex items-center gap-2 text-base font-medium text-foreground">
              <Sparkles className="size-4 text-primary" />
              {result.source === "ai" ? "AI 增强评分" : "规则降级结果"}
            </div>
            {result.notice ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.notice}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">六维得分</h2>
          <div className="mt-6 space-y-4">
            {rankedPlantIds.map((plantId) => {
              const profile = plantProfilesById[plantId];
              const theme = plantThemeMap[plantId];
              const score = result.scores[plantId];

              return (
                <div key={plantId} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-foreground">{profile.name}</span>
                    <span className="text-sm text-muted-foreground">{score} / 100</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", theme.bar)}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <article className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">详细评语</h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              {result.detailedComment}
            </p>
          </article>
          <article className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">俏皮短评</h2>
            <p className="mt-4 text-lg leading-8 text-foreground">{result.playfulComment}</p>
          </article>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={handleRestart}>
              重新测一次
              <RefreshCcw />
            </Button>
            <Button size="lg" variant="outline" onClick={handleReviewQuestions}>
              回看题目
              <ArrowLeft />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
