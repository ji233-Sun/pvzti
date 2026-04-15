import type { Metadata } from "next";

import { QuizQuestions } from "@/components/pvzti/quiz-questions";

export const metadata: Metadata = {
  title: "回答问题",
  description: "逐题完成 PVZTI 测评，记录你的植物人格倾向。",
};

export default function QuizQuestionsPage() {
  return <QuizQuestions />;
}
