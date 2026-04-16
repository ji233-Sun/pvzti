import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allPlants } from "@/lib/pvzti/plants";

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,80,220,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            如果人格是一片草坪，
            <br />
            <span className="text-primary">你会长成哪株植物？</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            仅需 20 道题，在 {allPlants.length} 种植物中找到最契合你的那一个。
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="min-w-44 text-base">
              <Link href="/quiz">
                开始测评
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-w-44 text-base">
              <Link href="/gallery">
                <BookOpen className="mr-1 size-4" />
                人格博览馆
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
