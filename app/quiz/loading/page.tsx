import type { Metadata } from "next";

import { QuizLoading } from "@/components/pvzti/quiz-loading";

export const metadata: Metadata = {
  title: "结果生成中",
  description: "PVZTI 正在结合你的答案与植物画像生成测评结果。",
};

export default function QuizLoadingPage() {
  return <QuizLoading />;
}
