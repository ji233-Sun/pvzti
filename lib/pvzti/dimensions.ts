import type { Dimensions, DimensionKey } from "./types";

export interface DimensionMeta {
  key: DimensionKey;
  name: string;
  lowLabel: string;
  highLabel: string;
  description: string;
}

export const dimensionMetas: DimensionMeta[] = [
  {
    key: "edge",
    name: "锋芒",
    lowLabel: "内敛蓄力",
    highLabel: "锐意进取",
    description: "行动风格：被动防守 vs 主动出击",
  },
  {
    key: "resonance",
    name: "共鸣",
    lowLabel: "理性分析",
    highLabel: "感性共情",
    description: "决策方式：逻辑驱动 vs 情感驱动",
  },
  {
    key: "order",
    name: "秩序",
    lowLabel: "随性而为",
    highLabel: "严谨计划",
    description: "行为模式：灵活应变 vs 有条不紊",
  },
  {
    key: "tenacity",
    name: "韧性",
    lowLabel: "爆发瞬击",
    highLabel: "持久坚守",
    description: "能量模式：短时爆发 vs 长线坚持",
  },
  {
    key: "bond",
    name: "联结",
    lowLabel: "独立行动",
    highLabel: "协同配合",
    description: "社交倾向：单兵作战 vs 团队协作",
  },
];

export function euclideanDistance(a: Dimensions, b: Dimensions): number {
  const dx = a.edge - b.edge;
  const dr = a.resonance - b.resonance;
  const do_ = a.order - b.order;
  const dt = a.tenacity - b.tenacity;
  const db = a.bond - b.bond;
  return Math.sqrt(dx * dx + dr * dr + do_ * do_ + dt * dt + db * db);
}
