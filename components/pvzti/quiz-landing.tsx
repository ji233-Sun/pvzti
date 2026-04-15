"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";

import { plantThemeMap } from "@/components/pvzti/plant-theme";
import { Button } from "@/components/ui/button";
import {
  createDefaultQuizSession,
  getActiveQuestionBank,
  loadQuizSession,
  saveQuizSession,
} from "@/lib/pvzti/quiz-session";
import { plantProfilesById, plantOrder } from "@/lib/pvzti/plants";
import { cn } from "@/lib/utils";

export function QuizLanding() {
  const router = useRouter();

  function startStandardQuiz() {
    saveQuizSession(window.sessionStorage, createDefaultQuizSession());
    router.push("/quiz/questions");
  }

  function continueQuiz() {
    const session = loadQuizSession(window.sessionStorage);

    if (session.mode === "ai-generated" && session.generationPrompt && !getActiveQuestionBank(session)) {
      router.push("/quiz/ai/generating");
      return;
    }

    if (session.result) {
      router.push("/quiz/result");
      return;
    }

    if (getActiveQuestionBank(session)) {
      router.push("/quiz/questions");
      return;
    }

    router.push("/quiz");
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-sm backdrop-blur sm:p-10">
        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs tracking-[0.24em] text-primary uppercase">
          PVZTI 测评
        </span>
        <h1 className="mt-6 max-w-2xl text-4xl leading-tight font-semibold text-foreground sm:text-5xl">
          用 20 道题，测出你更像哪株植物。
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          这是一个借鉴 MBTI 体验节奏的轻量人格测评。你会在 20 道题里留下偏好轨迹，我们先做基础维度计算，再在结束阶段用 AI
          结合植物画像进行二次评估。
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="rounded-full border border-border bg-background px-3 py-1">
            20 个问题
          </span>
          <span className="rounded-full border border-border bg-background px-3 py-1">
            6 个植物维度
          </span>
          <span className="rounded-full border border-border bg-background px-3 py-1">
            AI 详细评语
          </span>
        </div>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">
          标准题库会直接进入现成 20 题；AI智能出题会先根据你的偏好生成一套全新题目。继续当前进度会优先恢复你正在进行的模式。
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" onClick={startStandardQuiz}>
            标准题库
            <ArrowRight />
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/quiz/ai")}>
            AI智能出题
            <Sparkles />
          </Button>
          <Button size="lg" variant="ghost" onClick={continueQuiz}>
            继续当前进度
            <RefreshCcw />
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {plantOrder.map((plantId) => {
          const profile = plantProfilesById[plantId];
          const theme = plantThemeMap[plantId];

          return (
            <article
              key={profile.id}
              className={cn(
                "rounded-[1.5rem] border p-4 shadow-sm backdrop-blur",
                theme.surface,
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                      theme.badge,
                    )}
                  >
                    {profile.name}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-foreground">
                    {profile.archetype}
                  </h2>
                </div>
                <ShieldCheck className={cn("size-5", theme.accent)} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {profile.tagline}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
