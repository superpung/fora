<div align="center">

# Fora

**简洁、快速的会议日程浏览器 —— 浏览每一场议程,标记你在意的内容,让日程在所有设备间同步。**

[![CI](https://github.com/superpung/fora/actions/workflows/ci.yml/badge.svg)](https://github.com/superpung/fora/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/superpung/fora?sort=semver)](https://github.com/superpung/fora/releases)

[English](README.md) · 中文

</div>

Fora 把密集的会议日程变得真正好用。从首页选择一个会议,浏览它的主旨报告与并行
分会场,通过给感兴趣的报告加星来构建你的个人日程,并让它在你使用的每一台设备
上同步 —— 无需安装任何应用。

## 功能

- **多会议首页** —— 一个站点,多个会议。选择其一,直接进入完整日程。
- **完整的会议内容** —— 主旨报告、并行分会场、讲者,全部中英双语呈现。
- **时间线** —— 把所有并行会场按时间并排排布,会议当天还会显示一条实时的
  "当前时间"红线。
- **个人日程** —— 给任意报告、会场或讲者加星,你的选择会汇成一份可筛选、可
  随时回看的专属日程。
- **跨设备同步** —— 用 GitHub 登录,即可把日程备份到你自己名下的私有 Gist 并
  在各设备间同步。仅浏览无需登录。
- **离线可用** —— 可作为 PWA 安装;加载后断网照常使用,离线所做的改动会在
  恢复网络时立即同步。
- **导出与导入** —— 把日程导出为日历(`.ics`)、表格(`.csv`)、Markdown
  (`.md`),或可再次导入的备份(`.json`)。
- **讲者目录** —— 按姓名、单位或报告搜索讲者,并可按首字母快速定位。
- **分享海报** —— 为整个会场或单场报告生成一张简洁的海报图片。
- **浅色与深色** —— 跟随系统,也可手动切换。无任何追踪。

## 你的日程,随处可用

加星是即时且本地保存的 —— 在当前设备上构建日程无需登录。当你希望手机和电脑都
能看到时,用 GitHub 登录即可:Fora 会把你的关注保存在你自己账号下的一个私有
Gist 中,并在各设备之间对账同步。除此之外没有任何数据离开你的浏览器,你也可以
随时在账户菜单里导出或清空数据。

## 开发

Fora 的前端是位于 [`web/`](web/) 的 React + Vite 单页应用。

```bash
cd web
pnpm install
pnpm dev        # 启动开发服务器
```

架构、数据模型、构建流水线,以及如何新增一个会议,详见 **[AGENTS.md](AGENTS.md)**。

## 参与贡献

欢迎贡献。请先阅读 **[AGENTS.md](AGENTS.md)** —— 它是本仓库的协作约定(规范、
数据模型,以及 UI 必须遵循的设计系统)。

## 许可证

[MIT](LICENSE) © Super Lee & Claude。跨设备同步由
[`@repus/gist-sync`](https://www.npmjs.com/package/@repus/gist-sync) 提供支持。
