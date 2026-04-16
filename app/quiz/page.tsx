"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { questionBank, allPlants } from "@/lib/pvzti/plants";
import { calculateDimensions, findMatchingPlant } from "@/lib/pvzti/scoring";
import {
  saveSession,
  loadSession,
  subscribeSession,
  saveResult,
  clearSession,
} from "@/lib/pvzti/quiz-session";
import { cn } from "@/lib/utils";

const questions = questionBank.questions;
const subscribeHydration = () => () => {};

export default function QuizPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isHydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const session = useSyncExternalStore(subscribeSession, loadSession, () => null);
  const currentIndex = session?.currentIndex ?? 0;
  const answers = session?.answers;

  const handleSelect = useCallback(
    (optionId: string) => {
      if (selectedId) return;
      setSelectedId(optionId);

      const question = questions[currentIndex];
      const newAnswers = { ...(answers ?? {}), [question.id]: optionId };
      const nextIndex = currentIndex + 1;

      setTimeout(() => {
        if (nextIndex >= questions.length) {
          const dims = calculateDimensions(questionBank, newAnswers);
          const match = findMatchingPlant(dims, allPlants);
          saveResult({ plantId: match.id, userDimensions: dims });
          router.push("/result");
          setTimeout(() => clearSession(), 0);
        } else {
          saveSession({ answers: newAnswers, currentIndex: nextIndex });
          setSelectedId(null);
        }
      }, 400);
    },
    [currentIndex, answers, selectedId, router]
  );

  if (!isHydrated) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </main>
    );
  }

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <main className="flex-1 bg-gradient-to-b from-primary/3 to-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            退出
          </Link>
          <span className="text-sm font-medium text-muted-foreground">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-8">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold leading-relaxed sm:text-2xl">
            {question.prompt}
          </h2>

          <div className="mt-6 space-y-3">
            {question.options.map((option) => {
              const isSelected = selectedId === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  disabled={!!selectedId}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all duration-200",
                    "hover:border-primary/50 hover:bg-primary/5",
                    "disabled:cursor-default",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "bg-card"
                  )}
                >
                  <span className="text-sm leading-relaxed">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
