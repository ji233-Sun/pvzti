"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, RefreshCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { questionBank } from "@/lib/pvzti/question-bank";
import {
  clearQuizSession,
  createEmptyQuizSession,
  loadQuizSession,
  saveQuizSession,
} from "@/lib/pvzti/quiz-session";
import type { QuizSessionState } from "@/lib/pvzti/quiz-session";
import { cn } from "@/lib/utils";

function createHydrationPlaceholder() {
  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-3 text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        正在恢复你的答题进度...
      </div>
    </section>
  );
}

export function QuizQuestions() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<{
    isHydrated: boolean;
    session: QuizSessionState;
  }>({
    isHydrated: false,
    session: createEmptyQuizSession(),
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const nextSession = loadQuizSession(window.sessionStorage);

      setSessionState({
        isHydrated: true,
        session: {
          ...nextSession,
          currentIndex: Math.min(nextSession.currentIndex, questionBank.questions.length - 1),
        },
      });
    });
  }, []);

  useEffect(() => {
    if (!sessionState.isHydrated) {
      return;
    }

    saveQuizSession(window.sessionStorage, sessionState.session);
  }, [sessionState]);

  if (!sessionState.isHydrated) {
    return createHydrationPlaceholder();
  }

  const { session } = sessionState;
  const currentQuestion = questionBank.questions[session.currentIndex];

  if (!currentQuestion) {
    clearQuizSession(window.sessionStorage);
    router.replace("/quiz");
    return createHydrationPlaceholder();
  }

  const currentAnswer = session.answers[currentQuestion.id];
  const answeredCount = Object.keys(session.answers).length;

  function handleSelect(optionId: string) {
    setSessionState((previous) => ({
      ...previous,
      session: {
        ...previous.session,
        answers: {
          ...previous.session.answers,
          [currentQuestion.id]: optionId,
        },
        result: null,
      },
    }));
    setErrorMessage(null);
  }

  function handleNext() {
    if (!currentAnswer) {
      return;
    }

    if (session.currentIndex === questionBank.questions.length - 1) {
      const nextSession = {
        ...session,
        result: null,
      };

      saveQuizSession(window.sessionStorage, nextSession);
      router.push("/quiz/loading");
      return;
    }

    setSessionState((previous) => ({
      ...previous,
      session: {
        ...previous.session,
        currentIndex: Math.min(
          previous.session.currentIndex + 1,
          questionBank.questions.length - 1,
        ),
      },
    }));
  }

  function handlePrevious() {
    setErrorMessage(null);
    setSessionState((previous) => ({
      ...previous,
      session: {
        ...previous.session,
        currentIndex: Math.max(previous.session.currentIndex - 1, 0),
      },
    }));
  }

  function handleRestart() {
    clearQuizSession(window.sessionStorage);
    router.push("/quiz");
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm tracking-[0.24em] text-primary uppercase">正在测评</div>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            第 {session.currentIndex + 1} / {questionBank.questions.length} 题
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          已回答 {answeredCount} / {questionBank.questions.length}
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{
            width: `${((session.currentIndex + 1) / questionBank.questions.length) * 100}%`,
          }}
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
                <div className="mt-2 text-sm text-muted-foreground">{option.tone}</div>
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
          onClick={handlePrevious}
          disabled={session.currentIndex === 0}
        >
          <ArrowLeft />
          上一题
        </Button>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" onClick={handleRestart}>
            重新开始
            <RefreshCcw />
          </Button>
          <Button size="lg" onClick={handleNext} disabled={!currentAnswer}>
            {session.currentIndex === questionBank.questions.length - 1 ? (
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
