import type { PlantId } from "@/lib/pvzti/types";

export const plantThemeMap: Record<
  PlantId,
  {
    badge: string;
    surface: string;
    bar: string;
    accent: string;
  }
> = {
  peashooter: {
    badge: "border-emerald-300 bg-emerald-100 text-emerald-800",
    surface: "border-emerald-200/80 bg-emerald-50/80",
    bar: "bg-emerald-500",
    accent: "text-emerald-700",
  },
  sunflower: {
    badge: "border-amber-300 bg-amber-100 text-amber-800",
    surface: "border-amber-200/80 bg-amber-50/80",
    bar: "bg-amber-500",
    accent: "text-amber-700",
  },
  wallnut: {
    badge: "border-stone-300 bg-stone-100 text-stone-800",
    surface: "border-stone-200/80 bg-stone-50/90",
    bar: "bg-stone-500",
    accent: "text-stone-700",
  },
  potatoMine: {
    badge: "border-orange-300 bg-orange-100 text-orange-800",
    surface: "border-orange-200/80 bg-orange-50/80",
    bar: "bg-orange-500",
    accent: "text-orange-700",
  },
  cabbagePult: {
    badge: "border-lime-300 bg-lime-100 text-lime-800",
    surface: "border-lime-200/80 bg-lime-50/80",
    bar: "bg-lime-500",
    accent: "text-lime-700",
  },
  cherryBomb: {
    badge: "border-rose-300 bg-rose-100 text-rose-800",
    surface: "border-rose-200/80 bg-rose-50/80",
    bar: "bg-rose-500",
    accent: "text-rose-700",
  },
};
