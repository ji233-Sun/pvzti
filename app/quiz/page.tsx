import type { Metadata } from "next";

import { QuizLanding } from "@/components/pvzti/quiz-landing";

export const metadata: Metadata = {
  title: "开始测评",
  description: "完成 20 道 PVZTI 题目，生成你的植物人格结果。",
};

export default function QuizPage() {
  return <QuizLanding />;
}
