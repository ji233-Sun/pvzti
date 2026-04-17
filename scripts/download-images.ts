import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RAW_PATH = join(ROOT, "data/raw-plants.json");
const PERSONALITIES_PATH = join(ROOT, "data/plant-personalities.json");
const OUTPUT_PATH = join(ROOT, "lib/pvzti/plant-data.json");
const PUBLIC_DIR = join(ROOT, "public/plants");
const CONCURRENCY = 10;

interface PlantRaw {
  id: string;
  name: string;
  image: string;
  icon: string;
  catalog: string;
  skillIntro: string;
  labels: string[];
  professionIcon: string;
}

interface PlantWithPersonality extends PlantRaw {
  personalityType: string;
  personalityBrief: string;
  personalityAnalysis: string;
  dimensions: Record<string, number>;
  [key: string]: unknown;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function extFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = extname(pathname).toLowerCase();
    return ext || fallback;
  } catch {
    return fallback;
  }
}

function basenameFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  const last = pathname.split("/").filter(Boolean).pop() || "";
  return decodeURIComponent(last);
}

async function downloadIfMissing(url: string, targetPath: string): Promise<boolean> {
  if (await fileExists(targetPath)) return false;
  await mkdir(dirname(targetPath), { recursive: true });
  const encoded = encodeURI(decodeURI(url));
  const res = await fetch(encoded, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(targetPath, buf);
  return true;
}

async function processInBatches<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next())
  );
  return results;
}

async function main() {
  const rawPlants: PlantRaw[] = JSON.parse(await readFile(RAW_PATH, "utf-8"));
  const personalities: PlantWithPersonality[] = JSON.parse(
    await readFile(PERSONALITIES_PATH, "utf-8")
  );
  const rawById = new Map(rawPlants.map((p) => [p.id, p]));

  const plants: PlantWithPersonality[] = personalities.map((p) => {
    const raw = rawById.get(p.id);
    return raw ? { ...p, icon: raw.icon, image: raw.image, professionIcon: raw.professionIcon } : p;
  });
  console.log(`Loaded ${plants.length} plants (raw=${rawPlants.length})`);

  const output: Array<PlantWithPersonality & {
    imageLocal: string;
    iconLocal: string;
    professionIconLocal: string;
  }> = [];

  let done = 0;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  await processInBatches(plants, CONCURRENCY, async (plant) => {
    const imageExt = plant.image ? extFromUrl(plant.image, ".png") : "";
    const iconExt = plant.icon ? extFromUrl(plant.icon, ".jpg") : "";

    const imageLocal = plant.image ? `/plants/images/${plant.id}${imageExt}` : "";
    const iconLocal = plant.icon ? `/plants/icons/${plant.id}${iconExt}` : "";

    let professionIconLocal = "";
    let professionBasename = "";
    if (plant.professionIcon) {
      professionBasename = basenameFromUrl(plant.professionIcon);
      professionIconLocal = `/plants/professions/${professionBasename}`;
    }

    const tasks: Array<{ url: string; target: string; label: string }> = [];
    if (plant.image) {
      tasks.push({
        url: plant.image,
        target: join(PUBLIC_DIR, "images", `${plant.id}${imageExt}`),
        label: "image",
      });
    }
    if (plant.icon) {
      tasks.push({
        url: plant.icon,
        target: join(PUBLIC_DIR, "icons", `${plant.id}${iconExt}`),
        label: "icon",
      });
    }
    if (plant.professionIcon) {
      tasks.push({
        url: plant.professionIcon,
        target: join(PUBLIC_DIR, "professions", professionBasename),
        label: "profession",
      });
    }

    const results = await Promise.allSettled(
      tasks.map((t) => downloadIfMissing(t.url, t.target))
    );
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        failed++;
        console.warn(`  [${plant.name}] ${tasks[i].label} failed:`, (r.reason as Error).message);
      } else if (r.value) {
        downloaded++;
      } else {
        skipped++;
      }
    });

    output.push({ ...plant, imageLocal, iconLocal, professionIconLocal });

    done++;
    if (done % 20 === 0) console.log(`Progress: ${done}/${plants.length}`);
  });

  output.sort((a, b) => Number(a.id) - Number(b.id));
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\nDone: ${done} plants processed`);
  console.log(`  downloaded=${downloaded}, cached=${skipped}, failed=${failed}`);
  console.log(`Final data written to ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
