"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { allPlants } from "@/lib/pvzti/plants";
import { GALLERY_PAGE_SIZE, filterPlants, paginatePlants } from "@/lib/pvzti/gallery";
import { PlantCard } from "@/components/pvzti/plant-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function GalleryPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => filterPlants(allPlants, search), [search]);
  const pagination = useMemo(
    () => paginatePlants(filtered, currentPage, GALLERY_PAGE_SIZE),
    [filtered, currentPage]
  );
  const visiblePages = useMemo(() => {
    const total = pagination.totalPages;
    const current = pagination.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    
    const pages = new Set([1, total, current, current - 1, current + 1]);
    const sortedPages = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    
    const result: (number | string)[] = [];
    let prev = 0;
    
    for (const page of sortedPages) {
      if (prev && page - prev > 1) {
        result.push("...");
      }
      result.push(page);
      prev = page;
    }
    
    return result;
  }, [pagination.currentPage, pagination.totalPages]);

  const hasPrev = pagination.currentPage > 1;
  const hasNext = pagination.currentPage < pagination.totalPages;
  const pageButtonClassName = "size-9 shrink-0 rounded-full px-0 text-sm sm:size-9";

  function renderPrevButton(className?: string) {
    return (
      <Button
        variant="outline"
        className={className}
        onClick={() => setCurrentPage((page) => page - 1)}
        disabled={!hasPrev}
      >
        上一页
      </Button>
    );
  }

  function renderNextButton(className?: string) {
    return (
      <Button
        variant="outline"
        className={className}
        onClick={() => setCurrentPage((page) => page + 1)}
        disabled={!hasNext}
      >
        下一页
      </Button>
    );
  }

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
              setCurrentPage(1);
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
            <div className="mb-4 text-sm text-muted-foreground">
              第 {pagination.currentPage} / {pagination.totalPages} 页，
              显示 {pagination.startItem}-{pagination.endItem} 项，共 {pagination.totalItems} 项
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagination.items.map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
            <div className="mt-8 sm:hidden">
              <div className="flex items-center justify-between gap-4">
                {renderPrevButton("flex-1")}
                <span className="text-sm text-muted-foreground font-medium">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                {renderNextButton("flex-1")}
              </div>
            </div>
            <div className="mt-8 hidden flex-wrap items-center justify-center gap-2 sm:flex">
              {renderPrevButton()}
              {visiblePages.map((page, i) => (
                typeof page === "string" ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
                    {page}
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={page === pagination.currentPage ? "default" : "outline"}
                    className={pageButtonClassName}
                    aria-current={page === pagination.currentPage ? "page" : undefined}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              ))}
              {renderNextButton()}
            </div>
            {search && (
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={() => setSearch("")}>
                  清空搜索
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
