"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { plantThemeMap } from "@/components/pvzti/plant-theme";
import { Button } from "@/components/ui/button";
import { questionBank } from "@/lib/pvzti/question-bank";
import { plantProfilesById, plantOrder } from "@/lib/pvzti/plants";
import { cn } from "@/lib/utils";
import type { AssessmentResult, QuizAnswers } from "@/lib/pvzti/types";

type Stage = "intro" | "quiz" | "result";

export function QuizExperience() {
  const [stage, setStage] = useState<Stage>("intro");
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentQuestion = questionBank.questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(answers).length;

  function resetQuiz() {
    setStage("intro");
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setErrorMessage(null);
  }

  function handleSelect(optionId: string) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: optionId,
    }));
    setErrorMessage(null);
  }

  function handleNext() {
    if (!currentQuestion || !currentAnswer) {
      return;
    }

    if (currentIndex === questionBank.questions.length - 1) {
      startTransition(() => {
        void submitAssessment();
      });
      return;
    }

    setCurrentIndex((previous) => previous + 1);
  }

  async function submitAssessment() {
    setErrorMessage(null);

    try {
      const response = await fetch("/api/assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionBank, answers }),
      });

      const payload = (await response.json()) as AssessmentResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "测评结果生成失败，请稍后重试。");
      }

      setResult(payload);
      setStage("result");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "测评结果生成失败，请稍后重试。",
      );
    }
  }

  if (stage === "intro") {
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
            这是一个借鉴 MBTI 体验节奏的轻量人格测评。你会在 20 道题里留下偏好轨迹，系统会直接依据题目里的维度分值计算结果，并给出对应的植物人格解析。
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border bg-background px-3 py-1">
              20 个问题
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1">
              6 个植物维度
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1">
              规则结果解析
            </span>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setStage("quiz")}>
              开始测评
              <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" onClick={resetQuiz}>
              重置状态
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

  if (stage === "result" && result) {
    const leadingProfile = plantProfilesById[result.leadingPlantId];
    const leadingTheme = plantThemeMap[result.leadingPlantId];
    const rankedPlantIds = [...plantOrder].sort(
      (left, right) => result.scores[right] - result.scores[left],
    );

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
              <div className="text-sm text-muted-foreground">评分方式</div>
              <div className="mt-2 flex items-center gap-2 text-base font-medium text-foreground">
                <Sparkles className="size-4 text-primary" />
                规则计算结果
              </div>
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
              <Button size="lg" onClick={resetQuiz}>
                重新测一次
                <RefreshCcw />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setStage("quiz");
                  setResult(null);
                  setCurrentIndex(0);
                }}
              >
                回看题目
                <ArrowLeft />
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm tracking-[0.24em] text-primary uppercase">正在测评</div>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            第 {currentIndex + 1} / {questionBank.questions.length} 题
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          已回答 {answeredCount} / {questionBank.questions.length}
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((currentIndex + 1) / questionBank.questions.length) * 100}%` }}
        />
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-border/70 bg-background/80 p-6">
        <div className="text-sm text-muted-foreground">{currentQuestion.title}</div>
        <h2 className="mt-2 text-2xl leading-9 font-semibold text-foreground">
          {currentQuestion.prompt}
        </h2>
        <div className="mt-6 grid gap-3">
          {currentQuestion.options.map((option) => {
            const isSelected = currentAnswer === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={cn(
                  "rounded-[1.5rem] border px-5 py-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/80",
                )}
              >
                <div className="font-medium text-foreground">{option.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            setErrorMessage(null);
            setCurrentIndex((previous) => Math.max(0, previous - 1));
          }}
          disabled={currentIndex === 0 || isPending}
        >
          <ArrowLeft />
          上一题
        </Button>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" onClick={resetQuiz} disabled={isPending}>
            重新开始
            <RefreshCcw />
          </Button>
          <Button size="lg" onClick={handleNext} disabled={!currentAnswer || isPending}>
            {isPending ? (
              <>
                <LoaderCircle className="animate-spin" />
                生成结果中
              </>
            ) : currentIndex === questionBank.questions.length - 1 ? (
              <>
                完成测评
                <Sparkles />
              </>
            ) : (
              <>
                下一题
                <ArrowRight />
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
