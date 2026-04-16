import Link from "next/link";
import { proxyImage } from "@/lib/pvzti/plants";
import type { PlantPersonality } from "@/lib/pvzti/types";
import { cn } from "@/lib/utils";

interface PlantCardProps {
  plant: PlantPersonality;
  className?: string;
}

export function PlantCard({ plant, className }: PlantCardProps) {
  return (
    <Link
      href={`/gallery/${plant.id}`}
      className={cn(
        "group block rounded-xl border bg-card p-4 shadow-sm",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-1",
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <img
          src={proxyImage(plant.image)}
          alt={plant.name}
          className="w-14 h-14 rounded-lg object-cover bg-secondary"
          loading="lazy"
        />
        <div className="min-w-0">
          <h3 className="font-semibold text-base truncate">{plant.name}</h3>
          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {plant.personalityType}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
        {plant.personalityBrief}
      </p>
    </Link>
  );
}
