"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, RotateCcw } from "lucide-react";
import { getPlant, plantIconSrc } from "@/lib/pvzti/plants";
import { loadResult, clearSession, subscribeResult } from "@/lib/pvzti/quiz-session";
import { DimensionChart } from "@/components/pvzti/dimension-chart";
import { Button } from "@/components/ui/button";

const subscribeHydration = () => () => {};

export default function ResultPage() {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const result = useSyncExternalStore(subscribeResult, loadResult, () => null);
  const plant = result ? getPlant(result.plantId) : null;
  const userDims = result?.userDimensions ?? null;

  useEffect(() => {
    if (isHydrated && (!result || !plant)) {
      router.replace("/quiz");
    }
  }, [router, isHydrated, result, plant]);

  if (!isHydrated || !plant || !userDims) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground">你的植物人格是</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <img
              src={plantIconSrc(plant)}
              alt={plant.name}
              className="w-32 h-32 rounded-2xl object-contain bg-secondary shadow-md"
            />
            <span className="mt-4 inline-block text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {plant.personalityType}
            </span>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{plant.name}</h1>
            <p className="mt-3 max-w-lg text-lg text-muted-foreground leading-relaxed">
              {plant.personalityBrief}
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-1">你的人格维度</h2>
            <p className="text-xs text-muted-foreground mb-4">竖线标记为植物维度，条形为你的得分</p>
            <DimensionChart dimensions={userDims} compareDimensions={plant.dimensions} />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">人格解读</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {plant.personalityAnalysis}
            </div>
          </div>

          {plant.catalog && (
            <div className="mt-8 rounded-xl bg-secondary/50 p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">图鉴原文</h3>
              <p className="text-sm text-muted-foreground/80 italic leading-relaxed">
                {plant.catalog}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href={`/gallery/${plant.id}`}>
              <BookOpen className="mr-1 size-4" />
              查看完整档案
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/gallery">
              人格博览馆
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            onClick={() => {
              clearSession();
              router.push("/quiz");
            }}
          >
            <RotateCcw className="mr-1 size-4" />
            重新测评
          </Button>
        </div>
      </div>
    </main>
  );
}
