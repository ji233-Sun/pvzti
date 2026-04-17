import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { allPlants, getPlant, plantIconSrc } from "@/lib/pvzti/plants";
import { DimensionChart } from "@/components/pvzti/dimension-chart";
import { Button } from "@/components/ui/button";

export function generateStaticParams() {
  return allPlants.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plant = getPlant(id);
  if (!plant) return {};
  return {
    title: `${plant.name} - ${plant.personalityType}`,
    description: plant.personalityBrief,
  };
}

export default async function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plant = getPlant(id);
  if (!plant) notFound();

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          返回博览馆
        </Link>

        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:gap-6">
            <img
              src={plantIconSrc(plant)}
              alt={plant.name}
              className="w-28 h-28 rounded-2xl object-contain bg-secondary shadow-sm"
            />
            <div className="mt-4 sm:mt-0">
              <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {plant.personalityType}
              </span>
              <h1 className="mt-2 text-3xl font-bold">{plant.name}</h1>
              <p className="mt-2 text-lg text-muted-foreground leading-relaxed">
                {plant.personalityBrief}
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">人格维度</h2>
            <DimensionChart dimensions={plant.dimensions} />
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">人格解读</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
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

          {plant.labels.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {plant.labels.map((label) => (
                <span
                  key={label}
                  className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Button asChild size="lg">
            <Link href="/quiz">
              做测评看看你是不是 {plant.name}
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
