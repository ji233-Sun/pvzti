import type { Metadata } from "next";

import { QuizAiGenerating } from "@/components/pvzti/quiz-ai-generating";

export const metadata: Metadata = {
  title: "AI 题库生成中",
  description: "PVZTI 正在根据你的偏好生成一套新的植物人格题库。",
};

export default function QuizAiGeneratingPage() {
  return <QuizAiGenerating />;
}
