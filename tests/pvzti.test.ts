import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import GalleryPage from "@/app/gallery/page";
import { paginatePlants } from "@/lib/pvzti/gallery";
import type { PlantPersonality } from "@/lib/pvzti/types";

function createPlant(id: number): PlantPersonality {
  return {
    id: String(id),
    name: `植物 ${id}`,
    image: "",
    imageLocal: "",
    icon: "",
    iconLocal: "",
    catalog: "",
    skillIntro: "",
    labels: [],
    professionIcon: "",
    professionIconLocal: "",
    personalityType: `类型 ${id}`,
    personalityBrief: `简介 ${id}`,
    personalityAnalysis: `分析 ${id}`,
    dimensions: {
      edge: id,
      resonance: id,
      order: id,
      tenacity: id,
      bond: id,
    },
  };
}

test("gallery 页面默认渲染分页控件，而不是加载更多按钮", () => {
  const html = renderToStaticMarkup(
    React.createElement(GalleryPage as React.ComponentType)
  );

  assert.ok(!html.includes("加载更多"), "不应该再渲染加载更多按钮");
  assert.ok(html.includes("上一页"), "应显示上一页分页控件");
  assert.ok(html.includes("下一页"), "应显示下一页分页控件");
});

test("gallery 页面为移动端分页提供独立操作区和可横向滚动的页码区", () => {
  const html = renderToStaticMarkup(
    React.createElement(GalleryPage as React.ComponentType)
  );

  assert.ok(html.includes("overflow-x-auto"), "页码区应支持横向滚动");
  assert.ok(html.includes("grid-cols-2"), "移动端上一页/下一页应独立排布");
});

test("分页逻辑会按页切片，并把越界页码夹紧到最后一页", () => {
  const plants = Array.from({ length: 5 }, (_, index) => createPlant(index + 1));
  const pagination = paginatePlants(plants, 99, 2);

  assert.equal(pagination.currentPage, 3);
  assert.equal(pagination.totalPages, 3);
  assert.equal(pagination.startItem, 5);
  assert.equal(pagination.endItem, 5);
  assert.deepEqual(
    pagination.items.map((plant) => plant.id),
    ["5"]
  );
});
