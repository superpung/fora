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
