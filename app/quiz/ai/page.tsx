import type { Metadata } from "next";

import { QuizAiConfig } from "@/components/pvzti/quiz-ai-config";

export const metadata: Metadata = {
  title: "AI 智能出题",
  description: "配置你的题目场景、表达风格和关系主题，生成一套新的 PVZTI 题库。",
};

export default function QuizAiPage() {
  return <QuizAiConfig />;
}
