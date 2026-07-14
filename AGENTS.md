# AGENTS.md — 本项目对 AI 助手的工作约定

## 禁止默认 fallback（硬性规则）
遇到任何障碍（缺依赖、环境不满足、接口报错、数据缺失、方案有分歧等），**不得擅自降级/绕过/选择"默认可行方案"**。
- 缺 Python 依赖 → 直接用 `uv add <pkg>`（本项目用 uv 管理）安装，不要因为"没装"就改用次优方案。
- 缺系统工具/权限/凭证，或有多个合理方案 → **停下来说明问题，向用户提问，由用户决定**。
- 需要做任何有后果或对外的动作前，先确认。
- 一句话：**有问题就说，不要自作主张 fallback。**

## Language rule (hard)
- **Chinese only when talking to the user** (chat replies).
- **Everything else in English**: code, code comments, documentation prose, commit messages, and the assistant's own reasoning.
- Exception: actual content that is inherently Chinese — the conference data itself and user-facing UI display strings (the audience is Chinese) — stays in Chinese; that is content, not code/docs.

## 项目要点
- 会议议程解析 + 网页展示。样例会议：CCF Chip 2026。
- 数据模型完全自建（`schema/schema.json`），**不兼容/不映射** pretalx/frab 等任何现成格式。
- 脏数据按"如实记录 + `flags` 标记"处理，不擅自修正。
- 网页设计需对齐 claude.ai 风格，细节到位，必须有动画。
- **站点托管多个会议**：`/` 是会议 Hub，每个会议在 `/:conf/...` 下（`conf` = 会议 id）。
  - 数据不是模块单例：`lib/data.ts` 的 `buildConferenceViews(raw)` 是纯工厂，注册表
    （`lib/conferences.ts`）按 id 构建并缓存视图，组件通过 `useConference()` 取当前会议。
  - 每会议一份数据 `web/src/data/conferences/<id>.json`，`manifest.json` 由构建脚本
    从这些文件重新生成，供 Hub / 切换器渲染（不加载整份数据集）。
  - 所有 per-conference 的存储 key 都命名空间化在会议 id 下（`<id>:followed.*`）；
    主题等站点级偏好不加命名空间。

## UI copy rules (hard)
- **No decorative eyebrow/kicker labels.** Never place a small label above a title
  just for decoration (e.g. `Program` over 完整日程, `Speakers` over 讲者,
  `Organizers` over 组织与赞助). If a heading needs reinforcement, use an icon, not
  an English kicker.
- **No prose-as-UI.** Do not explain an action in a sentence when an
  icon (or icon + short label) button conveys it. E.g. never write
  "需要按时间线逐场浏览？前往完整日程。" — ship a button instead.
- **Never stack small text above any heading.** Supporting metadata (code, room,
  dates, location, counts) goes *below* the heading or *beside* it on the same
  line — never on a line above it. This applies to every title/heading (page
  titles, section heads, card/row headers), not just the page's main title.
- **No left-edge highlight bars.** Do not indicate an active/anchored/selected
  item with a colored strip on its left edge (e.g. `box-shadow: inset 3px 0 0`).
  Use a full-surface background tint (and/or an icon) instead.
