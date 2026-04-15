import Link from "next/link";
import { ArrowRight, Orbit, Shield, Sparkles, SunMedium, TimerReset, Zap } from "lucide-react";

import { plantThemeMap } from "@/components/pvzti/plant-theme";
import { Button } from "@/components/ui/button";
import { plantProfiles } from "@/lib/pvzti/plants";

const plantIcons = {
  peashooter: Zap,
  sunflower: SunMedium,
  wallnut: Shield,
  potatoMine: TimerReset,
  cabbagePult: Orbit,
  cherryBomb: Sparkles,
} as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(253,230,138,0.22),transparent_28%),radial-gradient(circle_at_left,rgba(134,239,172,0.18),transparent_26%),linear-gradient(180deg,#fffdf6_0%,#f4f1e6_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <section className="grid gap-8 rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-sm backdrop-blur sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs tracking-[0.24em] text-primary uppercase">
              PVZTI
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl leading-tight font-semibold tracking-tight text-foreground sm:text-6xl">
              如果人格是一片草坪，你会长成哪株植物？
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              这是一套借鉴 MBTI 体验节奏的植物人格测评。你会在 20 道题里留下偏好路径，系统会直接依据题目里的维度分值计算结果，并给出对应的植物人格解析。
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-border bg-background px-3 py-1">
                20 个问题
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1">
                6 个植物维度
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1">
                规则结果解析
              </span>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/quiz">
                  开始测评
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#dimension-grid">先看六种植物</a>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {plantProfiles.slice(0, 4).map((profile) => {
              const Icon = plantIcons[profile.id];
              const theme = plantThemeMap[profile.id];

              return (
                <article
                  key={profile.id}
                  className={`rounded-[1.5rem] border p-5 shadow-sm ${theme.surface}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${theme.badge}`}
                    >
                      {profile.name}
                    </div>
                    <Icon className={`size-5 ${theme.accent}`} />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-foreground">
                    {profile.archetype}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {profile.tagline}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="dimension-grid" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plantProfiles.map((profile) => {
            const Icon = plantIcons[profile.id];
            const theme = plantThemeMap[profile.id];

            return (
              <article
                key={profile.id}
                className={`rounded-[1.75rem] border p-6 shadow-sm backdrop-blur ${theme.surface}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${theme.badge}`}
                  >
                    {profile.name}
                  </div>
                  <Icon className={`size-5 ${theme.accent}`} />
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">
                  {profile.archetype}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {profile.description}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  {profile.strengths.map((strength) => (
                    <li key={strength}>• {strength}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
