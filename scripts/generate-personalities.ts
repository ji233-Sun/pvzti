import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const RAW_PATH = fileURLToPath(new URL("../data/raw-plants.json", import.meta.url));
const OUT_PATH = fileURLToPath(new URL("../data/plant-personalities.json", import.meta.url));

const API_KEY = process.argv[2];
const BASE_URL = process.argv[3] || "https://api.deepseek.com/v1";
const MODEL = process.argv[4] || "deepseek-chat";
const CONCURRENCY = 5;
const MAX_RETRIES = 3;

if (!API_KEY) {
  console.error("Usage: tsx scripts/generate-personalities.ts <API_KEY> [BASE_URL] [MODEL]");
  process.exit(1);
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

interface Personality {
  personalityType: string;
  personalityBrief: string;
  personalityAnalysis: string;
  dimensions: { edge: number; resonance: number; order: number; tenacity: number; bond: number };
}

interface PlantFull extends PlantRaw, Personality {}

const SYSTEM_PROMPT = `你是一位专业的MBTI人格分析师，同时也是植物大战僵尸的资深玩家。你需要根据植物的游戏描述和技能特点，为每个植物生成一份独特的MBTI风格人格档案。

## 人格维度体系（每维 1-100 分）

1. **锋芒 (edge)**: 1=内敛蓄力/被动防守 ↔ 100=锐意进取/主动出击
2. **共鸣 (resonance)**: 1=理性分析/逻辑驱动 ↔ 100=感性共情/情感驱动
3. **秩序 (order)**: 1=随性而为/灵活应变 ↔ 100=严谨计划/有条不紊
4. **韧性 (tenacity)**: 1=爆发瞬击/短时爆发 ↔ 100=持久坚守/长线坚持
5. **联结 (bond)**: 1=独立行动/单兵作战 ↔ 100=协同配合/团队协作

## 输出要求

请严格按以下JSON格式输出（不要包含markdown代码块标记）：
{
  "personalityType": "4字人格标签，如：守护型执行者、策略型分析师",
  "personalityBrief": "一句话人格短评（15-30字），概括其核心人格特质",
  "personalityAnalysis": "2-3段MBTI风格人格解读（150-300字），分析其行为模式、优势、成长方向",
  "dimensions": { "edge": 数字, "resonance": 数字, "order": 数字, "tenacity": 数字, "bond": 数字 }
}

## 关键原则
- 维度分数要根据植物实际特点合理分配，避免全部集中在50附近
- 人格解读要有深度，像真正的MBTI分析一样具有洞察力
- 每个植物的人格要独特，体现其个性
- 用拟人化的方式描述，就像在分析一个真实的人`;

async function callLLM(plant: PlantRaw): Promise<Personality> {
  const userPrompt = `请为以下植物生成人格档案：

植物名称：${plant.name}
技能简介：${plant.skillIntro}
图鉴描述：${plant.catalog}
标签：${plant.labels.join("、")}

请直接输出JSON，不要包含任何额外文字或markdown标记。`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const content = json.choices[0].message.content.trim();
      const cleaned = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleaned) as Personality;

      if (
        !parsed.personalityType ||
        !parsed.personalityBrief ||
        !parsed.personalityAnalysis ||
        !parsed.dimensions
      ) {
        throw new Error("Incomplete personality data");
      }

      for (const key of ["edge", "resonance", "order", "tenacity", "bond"] as const) {
        const v = parsed.dimensions[key];
        if (typeof v !== "number" || v < 1 || v > 100) {
          parsed.dimensions[key] = Math.max(1, Math.min(100, Math.round(v || 50)));
        }
      }

      return parsed;
    } catch (e) {
      if (attempt < MAX_RETRIES - 1) {
        console.warn(`  Retry ${attempt + 1} for ${plant.name}: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      } else {
        throw e;
      }
    }
  }
  throw new Error("Unreachable");
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
  const rawPlants: PlantRaw[] = JSON.parse(await readFile(RAW_PATH, "utf-8"));
  console.log(`Loaded ${rawPlants.length} plants`);

  const existing: Record<string, Personality> = {};
  try {
    const data: PlantFull[] = JSON.parse(await readFile(OUT_PATH, "utf-8"));
    for (const p of data) {
      existing[p.id] = {
        personalityType: p.personalityType,
        personalityBrief: p.personalityBrief,
        personalityAnalysis: p.personalityAnalysis,
        dimensions: p.dimensions,
      };
    }
    console.log(`Found ${Object.keys(existing).length} existing personalities (will skip)`);
  } catch {
    console.log("No existing data, starting fresh");
  }

  const results: PlantFull[] = [];
  let generated = 0;
  let skipped = 0;

  await processInBatches(rawPlants, CONCURRENCY, async (plant) => {
    if (existing[plant.id]) {
      results.push({ ...plant, ...existing[plant.id] });
      skipped++;
      return;
    }

    try {
      const personality = await callLLM(plant);
      results.push({ ...plant, ...personality });
      generated++;
      console.log(`[${generated + skipped}/${rawPlants.length}] ${plant.name}: ${personality.personalityType}`);
    } catch (e) {
      console.error(`FAILED ${plant.name}: ${(e as Error).message}`);
      results.push({
        ...plant,
        personalityType: "未知型探索者",
        personalityBrief: `${plant.name}，一个等待被发现的独特人格。`,
        personalityAnalysis: `${plant.name}拥有独特而神秘的人格特质，如同其在战场上的表现一样令人印象深刻。`,
        dimensions: { edge: 50, resonance: 50, order: 50, tenacity: 50, bond: 50 },
      });
      generated++;
    }

    if ((generated + skipped) % 10 === 0) {
      results.sort((a, b) => Number(a.id) - Number(b.id));
      await writeFile(OUT_PATH, JSON.stringify(results, null, 2), "utf-8");
    }
  });

  results.sort((a, b) => Number(a.id) - Number(b.id));
  await writeFile(OUT_PATH, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nGenerated: ${generated}, Skipped: ${skipped}`);
  console.log(`Personality data written to ${OUT_PATH}`);
  console.log("Next step: run `pnpm fetch:images` to localize images and build plant-data.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
