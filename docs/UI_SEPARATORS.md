# Middle-dot decisions

The user prohibited new application-authored middle-dot separators on October 31,
2026 and subsequently reviewed every existing use. The table records the final
scope, not only the latest edit. Original conference content is preserved.

| ID | Surface | Current decision and implementation |
| --- | --- | --- |
| 1 | Country and city | Retain `中国·天津` in hub/home/poster locations. |
| 2 | Home date and location | Remove the separator; calendar and pin icons identify separate fields. |
| 3 | Home keynote groups | Use spaced title, clock/period and report count. |
| 4 | Home filter summary | Use separate search/star metadata with spacing. |
| 5 | Conference picker | Use separate calendar/date and pin/city metadata. |
| 6 | My Day | Shared rounded forum-code badge before the name. Preserve the time column. |
| 7 | Planner | Shared badge before the forum name. Report title and speakers precede metadata. |
| 8 | Timeline without reports | Clock/time followed by spaced publication status. |
| 9 | Live date | Calendar icon with date and weekday. |
| 10 | Upcoming forum group | Forum icon/title and pin/room count. |
| 11 | Committee | Retain the affiliation/title separator as requested. |
| 12 | Organizations | Shared forum-code badge before the forum name. |
| 13 | Search results | Structured metadata items separated by layout gaps; forum codes use the shared badge. Ranking inputs are unchanged. |
| 14 | Notifications | Use a colon between the countdown and session/count text. |
| 15 | Share posters | Remove the report/count separator and, after explicit confirmation, the multi-speaker separator. Use whitespace between speakers. The forum identifier uses a neutral rounded badge. |
| 16 | Markdown export | Use an em dash between the agenda label and conference name. |

Date/time separators in heat rows, forum/session metadata, live upcoming items
and report-poster timestamps were already removed. The forum identifier badge
also applies to Home, forum details, Now, topic reports/groups and similar talks.
`ForumCode` / `ForumIdentity` own the HTML presentation; the offline canvas
renderer draws the matching neutral badge at poster scale.

The former speaker separator appeared only within a forum poster's report list
when that report named multiple speakers. For example, ChinaSoft 2026 R1's
opening introduction names 魏峻、高钰、张雅坤、刘哲. Single-speaker rows and the
separate full-report poster did not show that separator.

## Conference text

The current four local conference datasets also contain dots inside titles,
abstracts, biographies and other content. These are data, not a shared UI
separator; they must not be changed by UI punctuation cleanup. Counts below describe
text fields, including repeated occurrences of the same source text, and do not
include text embedded in source images. Excerpts are limited to identify the
content without copying entire biographies into this inventory.

### chinaosc2026

17 fields, 12 distinct strings.

| Data locations | Excerpt |
| --- | --- |
| `.forums[2].title.zh` | 共建·共治·共成长——数据科技开源社区建设路径与生态实践分论坛 |
| `.forums[2].talks[2].title.zh` | 开放·共享·创新：开源政策赋能科学教育新生态 |
| `.forums[2].talks[3].speakers[0].affiliation_raw`, `.forums[2].talks[8].speakers[1].affiliation_raw` | 涛思数据创始人·CEO |
| `.forums[2].poster.source_url`, `.forums[2].extra.images[4].url` | …n/api/file/statics/2026/08/11/议程_共建·共治·共成长_20260811101910A799.png |
| `.forums[2].extra.cms_doc_name` | 【2026CCF中国开源大会分论坛介绍】共建·共治·共成长——数据科技开源社区建设路径与生态实践分论坛 |
| `.forums[2].extra.images[4].file`, `.forums[2].extra.timetable_images[0]` | 议程_共建·共治·共成长_20260811101910A799.png |
| `.forums[2].extra.timetable_notes[0]` | …e_20260724195337A470.png, now 议程_共建·共治·共成长_20260811101910A799.png, 1541x2147). Re-transcribed from the new ima… |
| `.forums[2].extra.timetable_notes[7]` | …15:05 title, the interpuncts in '开放·共享·创新' and '涛思数据创始人·CEO', the em dash in '社区共识的重构——演进中的开源规则', and the half… |
| `.forums[10].talks[6].title.zh` | 砻盘筑基 · 开源赋能——提速具身智能规模化应用进程 |
| `.forums[18].talks[3].speakers[0].affiliation_raw`, `.forums[18].talks[7].speakers[3].affiliation_raw` | 涛思数据创始人· CEO |
| `.forums[18].talks[3].speakers[0].bio`, `.forums[18].talks[7].speakers[3].bio` | 涛思数据创始人· CEO ，开源软件 TDengine 时序数据库主要作者，2024 年“中国计算机学会(CCF)杰出工程师奖”获得者。1994年中国科大毕业后，赴美留学，先后在芝加哥Motorola、3Com等公司从事… |
| `.forums[18].extra.timetable_notes[3]` | 陶建辉's 单位 cell reads '涛思数据创始人· CEO' — the middle dot and the space before 'CEO' are as printed. |

### ccfchip2026

15 fields, 15 distinct strings.

| Data locations | Excerpt |
| --- | --- |
| `.forums[3].talks[0].abstract` | 在人工智能算法深度渗透至高精度推理与边缘端训练场景的背景下，传统冯·诺依曼计算架构因存储单元与计算单元之间的数据迁移瓶颈，能效的提升受到显著制约。存内计算架构通过将计算逻辑嵌入存储阵列内部，消除了冗余的数据搬运开销，已成… |
| `.forums[4].description` | 神经形态计算与存算一体作为后摩尔时代突破冯·诺伊曼瓶颈的核心技术方向，是破解“存储墙”、“功耗墙”瓶颈，推动人工智能与集成电路深度融合的关键途径。类脑计算与存算一体技术为高效处理海量数据、提升计算能效提供了全新范式，已成… |
| `.forums[4].talks[0].abstract` | …架构垂直协同设计，研究新型器件及大规模存算一体架构关键技术，有望突破冯·诺依曼存储墙瓶颈，为智能计算领域自主核心技术研发提供理论与技术支撑。 |
| `.forums[5].talks[3].speakers[0].bio` | …025年日内瓦国际发明展评审团特别嘉许金奖和2024年世界人工智能大会·云帆奖“璀璨明星”等奖项。 |
| `.forums[10].title.zh` | 星火相传·智算燎原：玄铁RISC-V产学研协同创新论坛 |
| `.forums[12].chairs[1].bio` | …模型与智能体，“天算计划”负责人，发表论文/专利百余篇，荣获“6G星辰·青年科学家”、入选计算所“新百星”计划等。 |
| `.forums[12].talks[1].title.zh` | 芯片·平台·生态——百度智能云赋能天基算力与芯片产业 |
| `.forums[12].talks[7].title.zh` | 算启苍穹·智链星河：天基计算时代下的商业航天供应链新生态与元器件保障体系研究 |
| `.forums[18].talks[0].abstract` | 随着大规模AI模型的发展，传统以控制流驱动的冯·诺依曼体系结构在数据搬运开销与并行表达能力方面面临显著瓶颈。面向以张量计算为主的工作负载，其计算过程呈现“强数据依赖、弱控制依赖”的特征，促使数据流体系结构重新受到关注。数… |
| `.forums[25].talks[4].abstract` | 传统冯·诺依曼架构存在存储与计算分离的固有瓶颈，数据搬运功耗高、延迟大，难以适配人工智能实时推理、高频信号处理、边缘端算力部署等高密度、低时延、高能效的算力需求。存内计算技术通过将存储与计算模块的紧密耦合，成为后摩尔时代… |
| `.forums[29].talks[4].abstract` | …栅控忆阻器及存内注意力器件，研制集成双台阶跳变的原子级AI芯片，突破冯·诺依曼瓶颈，形成”量子效应调控-感存算融合”新型计算体系。感知方面，在Nature Machine Intelligence研制石墨烯智能人工喉，实… |
| `.forums[32].chairs[1].bio` | … SRC全球第一。个人荣获2024 MIT TR35、2024算力中国·青年先锋人物（全国每年10人）、2022 WAIC云帆奖、2021 NeurIPS BIGANN竞赛全球冠军等荣誉。 |
| `.forums[41].talks[1].abstract` | 冯·诺依曼架构的“存储墙”与“功耗墙”问题在AI大模型时代愈发严峻，存算一体技术通过将计算与存储融合，从根源上减少数据搬运开销，成为突破传统架构瓶颈的关键路径。当前，存算一体涵盖多种实现形式：先进封装（2.5D/3D）与… |
| `.forums[44].chairs[1].bio` | …片的设计自动化。他曾获得日本学术振兴会（JSPS）邀请学者奖、亚历山大·冯·洪堡基金会的洪堡研究奖、慕尼黑工业大学高等研究院的汉斯·费舍尔学者奖，以及不列颠哥伦比亚大学彼得·沃尔高等研究院的国际访问研究奖学金。曾担任AC… |
| `.forums[47].talks[4].speakers[0].bio` | …研究。主持国家自然科学基金及北京市自然科学基金青年项目、北京市高创计划·交叉合作课题等10余项，成果转化2项。发表IEEE TCAS-I、IEEE TCAS-II、IEEE TNS、APL、ICCAD、NSREC、RAD… |

### chinasoft2025

6 fields, 6 distinct strings.

| Data locations | Excerpt |
| --- | --- |
| `.committees[11].members[166].affiliation_raw` | 穆罕默德·本·扎耶德人工智能大学 |
| `.forums[5].talks[5].speakers[0].bio` | …0余篇AI领域高水平论文。他构建了全球首个可交互养成的虚拟偶像—“琥珀·虚颜”；所构建的智能客服机器人已累计服务用户超过10亿人次。目前，他担任中国计算机学会术语工委副主任，自然语言处理专委秘书长，信息系统专委常委，智能… |
| `.forums[8].talks[1].speakers[0].bio` | …，获WWW2019最佳论文奖、TSC 2024 最佳论文奖、《中国科学·信息科学》10年持续影响力论文奖等10余次国际期刊/会议优秀论文荣誉，获国家技术发明一等奖、教育部“青年科学奖”、CCF-IEEE CS“青年科学家… |
| `.forums[27].talks[4].speakers[0].bio` | …广泛应用，以通讯作者或第一作者在《自然》（2023，封面论文）、《自然·通讯》（2021，2024，featured articles）等高水平期刊发表论文。曾获IEEE智能交通系统学会最佳博士学位论文奖、美国运筹与管理… |
| `.forums[51].talks[6].speakers[0].bio` | …青博士服务团团长（挂职青海师范大学计算机学院副院长），青海省“昆仑英才·高端创新创业人才”计划领军人才。主要从事智能感知、物联网与智能化系统等方向的研究。主持包括国家重点研发计划、国家自然科学基金、青海省重点研发与转化计… |
| `.forums[64].talks[7].abstract` | …面临的自我怀疑、信心不足等内在挑战。本报告以个体心理学创始人阿尔弗雷德·阿德勒的“自卑与超越”理论为框架，结合报告人自身的科研成长经历，首先剖析科研旅程中常见的“自卑”时刻——例如，面对学术竞争时的无力感、论文写作与发表… |

### chinasoft2026

4 fields, 2 distinct strings.

| Data locations | Excerpt |
| --- | --- |
| `.forums[38].talks[3].title.zh` | HarmonyOS·7·创新技术与新特性解析 |
| `.forums[53].chairs[1].bio`, `.forums[53].talks[2].speakers[0].bio`, `.forums[53].talks[6].speakers[2].bio` | …任两家AI独角兽企业CTO，构建了全球首个可交互养成的虚拟偶像—“琥珀·虚颜”；所构建的智能客服机器人已累计服务用户超过100亿人次。目前，他担任全球最大开放知识图谱社区OpenKG首任轮值主席，中国计算机学会术语工委副… |

## Non-rendered matches

CSS/code comments, Markdown documentation language links and test screenshot
captions also contain the character. They do not render in the app. The poster
line-breaking punctuation set contains the character to avoid starting a line
with source punctuation; it does not insert a separator.
