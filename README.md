# PVZTI

PVZTI 是一个以《植物大战僵尸》植物人格为主题的轻量测评应用。用户可以使用标准 20 题题库，或者先描述场景与偏好，由 AI 生成一套新的 20 题题库，再完成测评并得到对应的植物人格结果。

当前结果页采用纯规则计分：

- 每道题的选项都带有硬编码 `scores`
- 最终六维分数只由题库中的 `scores` 计算得出
- AI 只用于“生成题目”，不再参与结果判定

## 功能概览

- 标准题库模式：直接进入内置的 20 题固定题库
- AI 智能出题模式：输入 `题目场景 / 表达风格 / 希望偏重的关系或主题` 后生成新题库
- 规则结果解析：基于六种植物维度输出分数、主属性和评语
- 进度恢复：答题进度保存在浏览器 `sessionStorage`
- 双模式共用流程：标准题库和 AI 题库共用答题页、加载页和结果页

## 植物维度

- `peashooter` / 豌豆射手：主动、直接、推进快
- `sunflower` / 向日葵：供能、支持、协调、重视长期关系
- `wallnut` / 坚果墙：守护、抗压、边界感强
- `potatoMine` / 土豆地雷：低调、观察、等待时机、关键点爆发
- `cabbagePult` / 卷心菜投手：抽离、统筹、结构化、全局视角
- `cherryBomb` / 樱桃炸弹：爆发、果断、关键时刻破局

## 用户流程

### 标准题库

1. 进入 `/quiz`
2. 选择 `标准题库`
3. 完成 20 题
4. 进入 `/quiz/loading` 计算结果
5. 在 `/quiz/result` 查看分数和评语

### AI 智能出题

1. 进入 `/quiz`
2. 选择 `AI智能出题`
3. 在 `/quiz/ai` 填写 3 个输入项
4. 在 `/quiz/ai/generating` 调用 AI 生成题库
5. 成功后进入 `/quiz/questions`
6. 完成答题后照常进入 `/quiz/loading` 和 `/quiz/result`

失败时不会静默回退到标准题库，而是保留失败态，并提供：

- `重新生成`
- `切回标准题库`

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui 风格组件
- `node:test` + `tsx --test`

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

如果你只想体验标准题库模式，可以不配置 AI 相关变量。

如果你需要启用 AI 智能出题，请至少提供：

```env
OPENAI_API_KEY=your_api_key_here
```

可选项：

```env
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini
```

说明：

- `OPENAI_API_KEY`：仅用于 AI 出题接口
- `OPENAI_BASE_URL`：支持 OpenAI 兼容接口
- `OPENAI_MODEL`：AI 出题时使用的模型

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 可用脚本

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
```

含义：

- `npm run dev`：本地开发
- `npm run build`：生产构建
- `npm run start`：运行生产构建
- `npm run lint`：运行 ESLint
- `npm test`：运行 `tests/pvzti.test.ts`

## Docker 运行

仓库内提供了 `Dockerfile` 和 `docker-compose.yml`。

### 使用 docker compose

1. 准备 `.env`

```bash
cp .env.example .env
```

2. 启动

```bash
docker compose up -d
```

默认映射端口：

- `39123 -> 3000`

启动后访问：

- `http://localhost:39123`

如果你想覆盖镜像地址，可以设置：

```env
PVZTI_IMAGE=ghcr.io/ji233-sun/pvzti:latest
```

## API

### `POST /api/question-bank/generate`

根据用户输入生成一套合法的 `QuestionBank`。

请求体示例：

```json
{
  "scenario": "校园社团",
  "tone": "轻松一点",
  "focus": "关系互动"
}
```

返回：

- 成功时返回生成后的题库
- 失败时返回错误信息

### `POST /api/assessment`

根据题库与用户答案计算结果。

请求体示例：

```json
{
  "questionBank": { "...": "..." },
  "answers": {
    "q01": "q01-a"
  }
}
```

说明：

- 结果由规则计算得出，不依赖 AI 评分
- 题库必须合法，答案必须与题库匹配

## 结果计算规则

结果计算位于 [`lib/pvzti/scoring.ts`](./lib/pvzti/scoring.ts)。

核心逻辑：

- 遍历所有题目与已选选项
- 汇总六个植物维度的原始分
- 计算每个维度在该题库下的最大可能分
- 将原始分归一化到 `0-100`
- 取最高分维度作为主属性

结果评语来自植物画像与模板文案，不会调用 AI 做二次评测。

## 会话与数据存储

- 当前项目不使用数据库
- 答题进度、AI 出题参数、结果都保存在浏览器 `sessionStorage`
- 会话 key：`pvzti.quiz.session`

这意味着：

- 刷新页面通常可以恢复当前会话
- 清空浏览器会话后，进度会丢失
- 不同浏览器或设备之间不会同步

## 目录结构

```text
app/
  api/
    assessment/
    question-bank/generate/
  quiz/
    ai/
    ai/generating/
    loading/
    questions/
    result/
components/pvzti/
lib/pvzti/
tests/
docs/
```

重点目录：

- `app/`：页面与 API 路由
- `components/pvzti/`：PVZTI 业务组件
- `lib/pvzti/`：题库、计分、会话、类型定义
- `tests/`：核心回归与接口测试
- `docs/`：AI 出题设计与 prompt 文档

## 测试

运行测试：

```bash
npm test
```

当前测试覆盖的重点包括：

- 题库合法性校验
- 规则计分
- 会话清洗与恢复
- AI 出题接口输入校验
- 结果接口按题库计算规则分
- 关键页面对活动题库的依赖关系

## 已知约束

- AI 智能出题依赖 OpenAI 兼容的 Chat Completions 接口
- AI 出题模式要求生成的题库必须严格满足 20 题、每题 4 个选项
- 当前结果体系固定为 6 种植物人格，不支持自定义人格模型

## 参考文档

- [`docs/pvzti-question-bank-prompt.md`](./docs/pvzti-question-bank-prompt.md)
- [`docs/superpowers/specs/2026-04-15-ai-smart-question-mode-design.md`](./docs/superpowers/specs/2026-04-15-ai-smart-question-mode-design.md)
