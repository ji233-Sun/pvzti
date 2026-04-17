const API_BASE = "https://pvz2.hrgame.com.cn/book";
const CONCURRENCY = 10;
const OUTPUT_PATH = new URL("../data/raw-plants.json", import.meta.url);

interface RawPlantListItem {
  id: string;
  name: string;
  avatar: string;
}

interface RawPlantDetail {
  bookId: string;
  bookName: string;
  bookimg: string;
  bookCatalog: string;
  skillIntroduction: string;
  bookLable: { bookLabelname: string }[];
  bookTypeIcon: string;
}

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = (await res.json()) as { code: number; data: T };
  if (json.code !== 0) throw new Error(`API error for ${url}`);
  return json.data;
}

async function fetchAllPlants(): Promise<RawPlantListItem[]> {
  const list = await fetchJson<RawPlantListItem[]>(`${API_BASE}/all?book_type=10`);
  return list.filter((p) => p.name !== "敬请期待");
}

function buildAvatarMap(list: RawPlantListItem[]): Map<string, string> {
  return new Map(list.map((p) => [p.id, p.avatar]));
}

async function fetchPlantDetail(id: string): Promise<RawPlantDetail> {
  return fetchJson<RawPlantDetail>(
    `${API_BASE}/detail?book_id=${id}&book_type=10&from=detail`
  );
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

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return results;
}

async function main() {
  console.log("Fetching plant list...");
  const list = await fetchAllPlants();
  const avatarMap = buildAvatarMap(list);
  console.log(`Found ${list.length} plants (excluded placeholders)`);

  const plants: PlantRaw[] = [];
  let done = 0;

  await processInBatches(list, CONCURRENCY, async (item) => {
    try {
      const detail = await fetchPlantDetail(item.id);
      plants.push({
        id: detail.bookId,
        name: detail.bookName,
        image: detail.bookimg,
        icon: avatarMap.get(detail.bookId) || "",
        catalog: detail.bookCatalog || "",
        skillIntro: detail.skillIntroduction || "",
        labels: (detail.bookLable || []).map((l) => l.bookLabelname),
        professionIcon: detail.bookTypeIcon || "",
      });
    } catch (e) {
      console.error(`Failed to fetch plant ${item.id} (${item.name}):`, e);
    }
    done++;
    if (done % 20 === 0) console.log(`Progress: ${done}/${list.length}`);
  });

  plants.sort((a, b) => Number(a.id) - Number(b.id));

  const { writeFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const outPath = fileURLToPath(OUTPUT_PATH);
  await writeFile(outPath, JSON.stringify(plants, null, 2), "utf-8");
  console.log(`\nDone! Wrote ${plants.length} plants to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
