"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { allPlants } from "@/lib/pvzti/plants";
import { PlantCard } from "@/components/pvzti/plant-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 40;

export default function GalleryPage() {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPlants;
    return allPlants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.personalityType.toLowerCase().includes(q) ||
        p.personalityBrief.toLowerCase().includes(q) ||
        p.labels.some((l) => l.toLowerCase().includes(q))
    );
  }, [search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            返回首页
          </Link>
          <h1 className="mt-4 text-3xl font-bold">人格博览馆</h1>
          <p className="mt-2 text-muted-foreground">
            {allPlants.length} 种植物人格，点击卡片查看详情
          </p>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索植物名、人格类型..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            没有找到匹配的植物人格
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  加载更多 ({filtered.length - visibleCount} 个)
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
