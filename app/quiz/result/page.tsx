import type { Metadata } from "next";

import { QuizResult } from "@/components/pvzti/quiz-result";

export const metadata: Metadata = {
  title: "测评结果",
  description: "查看你的 PVZTI 植物人格结果与规则解析。",
};

export default function QuizResultPage() {
  return <QuizResult />;
}
