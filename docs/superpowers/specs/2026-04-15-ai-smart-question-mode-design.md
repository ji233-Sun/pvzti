# PVZTI AI 智能出题模式设计

## 背景

当前 PVZTI 只有一套固定题库 `lib/pvzti/questions.json`。用户从 `/quiz` 进入后，所有答题、结果生成和回看流程都默认依赖这套静态题库。

本次要新增一个全新模式 `AI智能出题`。该模式允许用户先输入自己的出题偏好，再由 AI 生成一套符合要求的 20 题题库供用户完成测评。

## 已确认决策

1. `AI智能出题` 仍然落到现有 6 个植物人格维度，不引入新的结果体系。
2. AI 负责生成题目与选项文案，最终结果页继续输出“你更像哪株植物”。
3. 用户前置输入保持轻量，只收 3 个字段：
   - `题目场景`
   - `表达风格`
   - `希望偏重的关系/主题`
4. AI 出题失败时不自动降级到默认题库。
5. 出题失败态只提供两个主动作：
   - `重新生成`
   - `切回标准题库`
6. 实现方案采用共享答题流程：
   - 新增 AI 配置与题库生成前置步骤
   - 复用现有答题页、结果生成页、结果展示页

## 目标

1. 在不破坏现有标准题库模式的前提下，引入 `AI智能出题` 作为新的入口模式。
2. 让 AI 模式生成的题库与现有 `QuestionBank` 抽象完全兼容。
3. 保持当前计分逻辑、植物画像、结果页主体结构可复用。
4. 让标准模式与 AI 模式共享尽可能多的页面和业务逻辑，避免后续维护分叉。

## 非目标

1. 不支持用户自定义结果人格体系。
2. 不支持用户手写超长自由 prompt。
3. 不支持 AI 出题失败后静默回退到默认题库。
4. 不在本次引入数据库或服务端持久化，会话仍保存在浏览器 `sessionStorage`。

## 用户流程

### 标准题库模式

1. 用户进入 `/quiz`。
2. 选择 `标准题库`。
3. 清理旧会话并装载默认题库。
4. 进入 `/quiz/questions`。
5. 完成答题后进入 `/quiz/loading` 生成结果。
6. 最终进入 `/quiz/result`。

### AI 智能出题模式

1. 用户进入 `/quiz`。
2. 选择 `AI智能出题`。
3. 跳转到新配置页 `/quiz/ai`。
4. 用户填写 3 个字段：
   - `题目场景`
   - `表达风格`
   - `希望偏重的关系/主题`
5. 提交后进入新生成页 `/quiz/ai/generating`。
6. 前端调用新接口生成题库。
7. 成功时：
   - 用新题库重建 session
   - 清空旧答案与旧结果
   - 跳转到 `/quiz/questions`
8. 失败时：
   - 停留在生成页失败态
   - 提供 `重新生成` 和 `切回标准题库`

## 页面与组件设计

### 1. `/quiz` 落地页

现有 `components/pvzti/quiz-landing.tsx` 由单入口改为双模式入口。

新增两个主操作：

1. `标准题库`
2. `AI智能出题`

页面需要清晰说明两者区别：

1. 标准题库：直接进入现成 20 题。
2. AI智能出题：先根据用户偏好生成一套专属 20 题。

继续答题的逻辑仍保留，但必须基于当前 session 的 `mode` 和 `questionBank` 决定进入路径。

### 2. `/quiz/ai` 配置页

新增一个轻量配置页组件，表单字段如下：

1. `题目场景`
   - 必填
   - 去首尾空格
   - 最大 80 字
2. `表达风格`
   - 必填
   - 去首尾空格
   - 最大 40 字
3. `希望偏重的关系/主题`
   - 必填
   - 去首尾空格
   - 最大 80 字

交互要求：

1. 提交前做前端必填与长度校验。
2. 提交成功后写入 session 中的配置快照。
3. 跳转到 `/quiz/ai/generating`。

### 3. `/quiz/ai/generating` 题库生成页

新增加载页组件，负责调用新接口 `POST /api/question-bank/generate`。

成功态：

1. 将返回的 `QuestionBank` 写入 session。
2. 将 `mode` 标记为 `ai-generated`。
3. 清空 `answers`、`currentIndex`、`result`。
4. 跳转到 `/quiz/questions`。

失败态：

1. 展示错误信息。
2. 提供 `重新生成` 按钮。
3. 提供 `切回标准题库` 按钮。

### 4. `/quiz/questions` 答题页

现有 `components/pvzti/quiz-questions.tsx` 不再直接依赖全局静态 `questionBank`，而是改为读取 session 中的活动题库。

行为要求：

1. 如果 session 中不存在合法题库，重定向回 `/quiz`。
2. 问题总数、当前题目、进度条、答题校验全部基于 session 内题库。
3. 标准模式与 AI 模式共用同一套答题 UI。

### 5. `/quiz/loading` 结果生成页

现有 `components/pvzti/quiz-loading.tsx` 改为从 session 中读取活动题库。

行为要求：

1. 校验是否答完时，基于活动题库而非默认题库。
2. 请求结果接口时，提交 `answers` 与当前题库。
3. 结果落盘后，`currentIndex` 设置为当前题库最后一题。

### 6. `/quiz/result` 结果页

现有 `components/pvzti/quiz-result.tsx` 改为基于活动题库判断“是否答完”和“是否需要跳回 loading”。

页面可增加一个轻量标签说明本次题目来源：

1. `标准题库`
2. `AI智能出题`

结果主体仍沿用现有植物画像、六维得分和评语结构。

## 数据模型设计

### QuestionBank

AI 生成题库必须复用现有 `lib/pvzti/types.ts` 中的 `QuestionBank` / `Question` / `QuestionOption` 结构。

也就是说，AI 返回的题库仍然必须满足：

1. 总计 20 题
2. 每题 4 个选项
3. 每个选项至少对一个植物维度产生正分
4. 选项 `scores` 的 key 只能来自现有 6 个植物维度

### 新增配置快照

建议新增类型：

```ts
type AiQuestionGenerationPrompt = {
  scenario: string;
  tone: string;
  focus: string;
};
```

### 扩展 QuizSessionState

当前 `QuizSessionState` 只有：

```ts
{
  answers: QuizAnswers;
  currentIndex: number;
  result: AssessmentResult | null;
}
```

需要扩展为：

```ts
{
  mode: "default" | "ai-generated";
  questionBank: QuestionBank | null;
  generationPrompt: AiQuestionGenerationPrompt | null;
  answers: QuizAnswers;
  currentIndex: number;
  result: AssessmentResult | null;
}
```

语义要求：

1. `mode`
   - 表示当前测评使用的是标准题库还是 AI 题库
2. `questionBank`
   - 表示当前活动题库
   - 标准模式下写入默认题库
   - AI 模式成功生成后写入动态题库
3. `generationPrompt`
   - 仅在 AI 模式下保留最近一次生成配置
   - 标准模式下为 `null`

### Session 清洗规则

`sanitizeQuizSession()` 需要扩展，保证：

1. 无效 `mode` 回退为默认值。
2. 非法 `questionBank` 清洗为 `null`。
3. 非法 `generationPrompt` 清洗为 `null`。
4. `questionBank` 缺失时，答题页和结果页不能继续工作。

## API 设计

### 1. `POST /api/question-bank/generate`

用途：根据用户偏好生成一套新的 20 题题库。

请求体：

```json
{
  "scenario": "校园社团与朋友协作",
  "tone": "轻松一点，有梗，但不要太油",
  "focus": "关系互动、合作分工、冲突处理"
}
```

成功响应：

```json
{
  "questionBank": {
    "version": "ai-2026-04-15T12:00:00.000Z",
    "totalQuestions": 20,
    "questions": []
  }
}
```

服务端职责：

1. 校验三个字段是否存在、是否为字符串、是否符合长度限制。
2. 调用 AI 生成严格符合 `QuestionBank` 结构的 JSON。
3. 对 AI 返回内容执行 `validateQuestionBank()`。
4. 校验失败时返回明确错误，不写入 session。

Prompt 设计要求：

1. 继续绑定现有 6 个植物维度。
2. 明确要求输出纯 JSON。
3. 明确要求总共 20 题、每题 4 个选项。
4. 明确要求题目风格受 `scenario`、`tone`、`focus` 影响。
5. 明确要求不要改变评分体系。

现有 `docs/pvzti-question-bank-prompt.md` 可以作为这条链路的基准文档或提示词素材来源，但实际服务端仍需要用代码构造可控 prompt，而不是直接把文档原样发给模型。

### 2. `POST /api/assessment`

现有接口只接收：

```json
{
  "answers": {}
}
```

在 AI 模式下，这不足以完成评分，因为服务端无法知道用户本次答的是哪一套题。

因此接口需要改为接收：

```json
{
  "questionBank": {},
  "answers": {}
}
```

服务端职责：

1. 校验 `questionBank` 是合法结构。
2. 基于传入题库执行 `validateQuizAnswers()`。
3. 基于传入题库执行 `calculateBaseScores()`。
4. 基于传入题库构建 `buildAssessmentContext()`。
5. AI 评分失败时保留现有规则降级逻辑。

这样标准模式与 AI 模式都能走同一条结果生成链路。

## 共享业务逻辑设计

为避免多个页面重复从 session 中解析当前题库，建议新增一个统一辅助层，例如：

1. `getActiveQuestionBank(session)`
2. `createDefaultQuizSession()`
3. `createAiQuizSession()`

这些辅助逻辑负责：

1. 给标准模式写入默认题库。
2. 给 AI 模式写入动态题库。
3. 统一处理“session 中没有合法题库”的边界。

这样可以避免 `quiz-landing`、`quiz-questions`、`quiz-loading`、`quiz-result` 各自手写一套题库兜底逻辑。

## 错误处理

### AI 出题失败

必须明确区分于 AI 结果生成失败。

交互要求：

1. 不自动回退默认题库。
2. 失败态只给两个主动作：
   - `重新生成`
   - `切回标准题库`

### 非法会话状态

以下情况统一视为会话无效：

1. `questionBank` 不存在
2. `questionBank` 结构不合法
3. `answers` 与当前题库不匹配

处理策略：

1. `/quiz/questions` 检测到无效会话时，跳回 `/quiz`
2. `/quiz/loading` 检测到无效会话时，跳回 `/quiz`
3. `/quiz/result` 检测到没有结果但答案完整时，跳去 `/quiz/loading`
4. `/quiz/result` 检测到题库缺失时，跳回 `/quiz`

## 测试策略

### 单元测试

扩展 `tests/pvzti.test.ts`，覆盖以下场景：

1. `sanitizeQuizSession()` 能正确清洗新增字段：
   - `mode`
   - `questionBank`
   - `generationPrompt`
2. `validateQuestionBank()` 能接受合法 AI 题库。
3. `validateQuestionBank()` 会拒绝不合法 AI 题库：
   - 不是 20 题
   - 某题不是 4 个选项
   - 某选项没有正分
4. `calculateBaseScores()` 可以基于动态题库正常计分。
5. `buildAssessmentContext()` 可以基于动态题库生成逐题答案摘要。

### 接口测试

新增服务端测试时，至少覆盖：

1. 题库生成接口在输入缺失时返回 400。
2. 题库生成接口在 AI 返回非法结构时返回明确失败。
3. 结果接口在缺少题库时返回 400。
4. 结果接口在答案与题库不匹配时返回 400。

### 回归测试

为了防止页面继续偷偷依赖全局静态题库，需要补最小回归保护，确保：

1. 答题页不再只从 `lib/pvzti/question-bank.ts` 读取题目。
2. 加载页不再只基于默认题库校验答题完整性。
3. 结果页不再只基于默认题库决定跳转。

## 实现约束

1. 保持标准题库模式对用户可见行为不变。
2. 不复制现有答题页、结果页做第二套 AI 专用实现。
3. 优先提炼共享 session/题库辅助逻辑，避免四个页面分散改写。
4. 不引入数据库、账户体系或服务端持久化。

## 验收标准

当以下条件同时满足时，此功能视为完成：

1. `/quiz` 页面可明确区分并进入两种模式。
2. AI 模式可填写 3 个字段并发起题库生成。
3. AI 返回合法题库后，用户可完成完整 20 题答题。
4. AI 模式的结果仍然稳定落到现有 6 个植物人格。
5. 题库生成失败时不会自动切回标准题库。
6. 标准模式不发生行为回归。
7. 相关测试通过，并覆盖新增 session、题库和接口边界。
