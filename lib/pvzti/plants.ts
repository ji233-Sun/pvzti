import { plantIds, type DimensionScores, type PlantId, type PlantProfile } from "./types";

export const plantOrder = [...plantIds];

export const plantProfiles: PlantProfile[] = [
  {
    id: "peashooter",
    name: "豌豆射手",
    archetype: "前线执行者",
    tagline: "先开火，再把节奏打出来。",
    description:
      "豌豆射手型的人通常直接、利落、行动优先，喜欢在局势刚起势时就抢到主动权。",
    strengths: ["推进果断", "反馈及时", "不怕先手试错"],
    watchouts: ["容易把节奏拉太快", "偶尔忽略队友承载力"],
    bias: ["偏好直接回应", "重视可见进展", "对拖延容忍度低"],
  },
  {
    id: "sunflower",
    name: "向日葵",
    archetype: "能量供给者",
    tagline: "先把阳光攒够，整片草地都会亮起来。",
    description:
      "向日葵型的人善于蓄能、协调与支持，擅长把资源、情绪和秩序稳稳地供给给团队。",
    strengths: ["擅长养成氛围", "资源感敏锐", "稳定且可持续"],
    watchouts: ["容易先顾全别人", "有时会推迟自己的判断"],
    bias: ["重视长期回报", "偏爱合作与照料", "擅长稳定军心"],
  },
  {
    id: "wallnut",
    name: "坚果墙",
    archetype: "边界守护者",
    tagline: "先顶住，再给全队争取空间。",
    description:
      "坚果墙型的人重视安全感、责任和秩序，擅长在压力面前站住位置，替别人挡下一波混乱。",
    strengths: ["抗压可靠", "边界清晰", "愿意承担责任"],
    watchouts: ["可能太习惯独自硬扛", "偶尔不愿快速变向"],
    bias: ["优先处理风险", "重视承诺", "倾向先稳住局面"],
  },
  {
    id: "potatoMine",
    name: "土豆地雷",
    archetype: "伏笔型反击者",
    tagline: "不急着出手，但一出手就很准。",
    description:
      "土豆地雷型的人低调、敏锐、耐心，常在观察和积累之后找到真正值得出手的瞬间。",
    strengths: ["善于等待时机", "观察深", "关键点爆发有效"],
    watchouts: ["启动慢会被误解", "容易把想法藏太久"],
    bias: ["喜欢先判断再行动", "偏好关键时刻出手", "对无效忙碌警惕"],
  },
  {
    id: "cabbagePult",
    name: "卷心菜投手",
    archetype: "高抛策略家",
    tagline: "站得远一点，反而看得更准。",
    description:
      "卷心菜投手型的人擅长抽离现场看结构，喜欢从更高的视角组织信息、节奏和路径。",
    strengths: ["结构感强", "擅长统筹", "能看见长期走势"],
    watchouts: ["偶尔会显得不够贴地", "容易把简单问题想复杂"],
    bias: ["喜欢先看全局", "重视节奏设计", "习惯从系统层面思考"],
  },
  {
    id: "cherryBomb",
    name: "樱桃炸弹",
    archetype: "瞬时决断者",
    tagline: "关键场面，就该用关键招。",
    description:
      "樱桃炸弹型的人判断快、情绪热、临门一脚强，擅长在关键时刻果断清场，推动转折发生。",
    strengths: ["决断迅速", "敢于承担破局成本", "临场影响力强"],
    watchouts: ["容易过度用力", "有时会让场面过热"],
    bias: ["面对僵局想立刻破题", "敢承担短期代价", "在高压时更有存在感"],
  },
];

export const plantProfilesById = Object.fromEntries(
  plantProfiles.map((profile) => [profile.id, profile]),
) as Record<PlantId, PlantProfile>;

export function createEmptyScores(): DimensionScores {
  return {
    peashooter: 0,
    sunflower: 0,
    wallnut: 0,
    potatoMine: 0,
    cabbagePult: 0,
    cherryBomb: 0,
  };
}
