import type { PlantPersonality } from "./types";

export const GALLERY_PAGE_SIZE = 40;

export interface PlantPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  items: PlantPersonality[];
}

export function filterPlants(plants: PlantPersonality[], search: string): PlantPersonality[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return plants;
  }

  return plants.filter(
    (plant) =>
      plant.name.toLowerCase().includes(query) ||
      plant.personalityType.toLowerCase().includes(query) ||
      plant.personalityBrief.toLowerCase().includes(query) ||
      plant.labels.some((label) => label.toLowerCase().includes(query))
  );
}

export function paginatePlants(
  plants: PlantPersonality[],
  page: number,
  pageSize: number = GALLERY_PAGE_SIZE
): PlantPagination {
  if (plants.length === 0) {
    return {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      startItem: 0,
      endItem: 0,
      items: [],
    };
  }

  const totalPages = Math.ceil(plants.length / pageSize);
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const items = plants.slice(startIndex, startIndex + pageSize);

  return {
    currentPage,
    totalPages,
    totalItems: plants.length,
    startItem: startIndex + 1,
    endItem: startIndex + items.length,
    items,
  };
}
