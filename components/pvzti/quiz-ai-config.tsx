"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createAiDraftQuizSession, saveQuizSession } from "@/lib/pvzti/quiz-session";

export function QuizAiConfig() {
  const router = useRouter();
  const [scenario, setScenario] = useState("");
  const [tone, setTone] = useState("");
  const [focus, setFocus] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPrompt = {
      scenario: scenario.trim(),
      tone: tone.trim(),
      focus: focus.trim(),
    };

    if (!nextPrompt.scenario || !nextPrompt.tone || !nextPrompt.focus) {
      setErrorMessage("请先填写完整的 AI 出题配置。");
      return;
    }

    saveQuizSession(window.sessionStorage, createAiDraftQuizSession(nextPrompt));
    router.push("/quiz/ai/generating");
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-sm sm:p-10">
      <div className="max-w-3xl">
        <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs tracking-[0.24em] text-primary uppercase">
          AI智能出题
        </div>
        <h1 className="mt-6 text-4xl leading-tight font-semibold text-foreground sm:text-5xl">
          先告诉 AI 你想测什么氛围
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">
          你填 3 条偏好，AI 会据此生成一套新的 20 道题，但最后仍然会映射回 PVZTI 的 6 个植物人格结果。
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="scenario">
            题目场景
          </label>
          <Textarea
            id="scenario"
            maxLength={80}
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            placeholder="例如：校园社团、合租生活、朋友旅行、创业团队"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="tone">
            表达风格
          </label>
          <Input
            id="tone"
            maxLength={40}
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            placeholder="例如：轻松一点、有梗但别太油"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="focus">
            希望偏重的关系/主题
          </label>
          <Textarea
            id="focus"
            maxLength={80}
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            placeholder="例如：合作分工、冲突处理、机会判断、关系互动"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg">
            开始生成题目
            <Sparkles />
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.push("/quiz")}>
            <ArrowLeft />
            返回模式选择
          </Button>
        </div>
      </form>
    </section>
  );
}
