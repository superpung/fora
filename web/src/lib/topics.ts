import type { Lang } from "./i18n-store";

// Display labels for the enrichment topic vocabulary. A talk's
// `enrichment.topics[]` stores VOCABULARY KEYS (source/topics.json is the
// authority); this module only mirrors that file's bilingual labels so the UI
// can render a key, and so an English query can reach a Chinese topic (a search
// for "in-memory computing" meets the 存算一体 label "Compute-in-Memory").
//
// Keys are the contract, labels are cosmetic: an unknown key falls back to
// itself, so a vocabulary the pipeline extends still renders correctly here.
// Like every other use of `enrichment`, these labels are AI-derived and only
// reach the UI when the AI-content toggle is on.

interface TopicLabel {
  zh: string;
  en: string;
}

const TOPIC_LABELS: Record<string, TopicLabel> = {
  "EDA": { zh: "EDA", en: "EDA" },
  "体系结构": { zh: "体系结构", en: "Computer Architecture" },
  "处理器": { zh: "处理器设计", en: "Processor Design" },
  "RISC-V": { zh: "RISC-V", en: "RISC-V" },
  "AI芯片": { zh: "AI芯片", en: "AI Chip / Accelerator" },
  "存算一体": { zh: "存算一体 / CIM", en: "Compute-in-Memory" },
  "神经形态": { zh: "神经形态计算", en: "Neuromorphic Computing" },
  "数据流计算": { zh: "数据流计算", en: "Dataflow Computing" },
  "近似计算": { zh: "近似计算", en: "Approximate Computing" },
  "先进封装": { zh: "先进封装 / Chiplet", en: "Advanced Packaging / Chiplet" },
  "制造工艺": { zh: "制造工艺 / 光刻", en: "Fabrication / Lithography" },
  "互连": { zh: "互连", en: "Interconnect" },
  "光电子": { zh: "光电子 / 光互连", en: "Photonics / Optical Interconnect" },
  "射频毫米波": { zh: "射频 / 毫米波 / 太赫兹", en: "RF / mmWave / Terahertz" },
  "二维半导体": { zh: "二维半导体", en: "2D Semiconductor" },
  "宽禁带半导体": { zh: "宽禁带半导体", en: "Wide-Bandgap Semiconductor" },
  "超导": { zh: "超导电路", en: "Superconducting Circuits" },
  "存储": { zh: "存储", en: "Memory / Storage" },
  "传感器": { zh: "传感器 / 感知", en: "Sensors / Sensing" },
  "生物医疗芯片": { zh: "生物医疗芯片", en: "Biomedical Chip" },
  "测试": { zh: "芯片测试 / DFT", en: "Test / DFT" },
  "可靠性容错": { zh: "可靠性 / 容错", en: "Reliability / Fault Tolerance" },
  "天基计算": { zh: "天基 / 太空计算", en: "Space-Based Computing" },
  "量子计算": { zh: "量子计算", en: "Quantum Computing" },
  "后量子密码": { zh: "后量子密码", en: "Post-Quantum Cryptography" },
  "硬件安全": { zh: "硬件安全", en: "Hardware Security" },
  "密态计算": { zh: "密态计算 / 同态加密", en: "Privacy-Preserving / Homomorphic Encryption" },
  "软件安全": { zh: "软件安全", en: "Software Security" },
  "隐私计算": { zh: "隐私计算", en: "Privacy Computing" },
  "大模型": { zh: "大模型 / LLM", en: "Large Language Models" },
  "智能体": { zh: "智能体 / Agent", en: "AI Agents" },
  "具身智能": { zh: "具身智能", en: "Embodied AI" },
  "多模态": { zh: "多模态", en: "Multimodal" },
  "AI4SE": { zh: "智能化软件工程", en: "AI for Software Engineering" },
  "代码生成": { zh: "代码生成", en: "Code Generation" },
  "软件测试": { zh: "软件测试", en: "Software Testing" },
  "程序分析": { zh: "程序分析", en: "Program Analysis" },
  "缺陷检测": { zh: "缺陷检测 / 漏洞挖掘", en: "Defect / Vulnerability Detection" },
  "形式化方法": { zh: "形式化方法 / 验证", en: "Formal Methods / Verification" },
  "软件架构": { zh: "软件架构", en: "Software Architecture" },
  "需求工程": { zh: "需求工程", en: "Requirements Engineering" },
  "软件维护": { zh: "软件维护 / 演化", en: "Software Maintenance / Evolution" },
  "移动软件": { zh: "移动软件", en: "Mobile Software" },
  "开源软件": { zh: "开源软件", en: "Open Source Software" },
  "软件供应链": { zh: "软件供应链", en: "Software Supply Chain" },
  "编译器": { zh: "编译器 / 编程语言", en: "Compilers / Programming Languages" },
  "操作系统": { zh: "操作系统", en: "Operating Systems" },
  "数据库": { zh: "数据库", en: "Database" },
  "分布式系统": { zh: "分布式系统", en: "Distributed Systems" },
  "云计算": { zh: "云计算 / 云原生", en: "Cloud / Cloud-Native" },
  "机器学习系统": { zh: "机器学习系统", en: "ML Systems" },
  "智能运维": { zh: "智能运维 / AIOps", en: "AIOps / DevOps" },
  "区块链": { zh: "区块链", en: "Blockchain" },
  "物联网": { zh: "物联网 / 边缘计算", en: "IoT / Edge Computing" },
  "数字孪生": { zh: "数字孪生 / 仿真", en: "Digital Twin / Simulation" },
  "软件教育": { zh: "软件教育", en: "Software Education" },
  "产业生态": { zh: "产业与生态", en: "Industry & Ecosystem" },
};

/** Localised label for a topic key (falls back to the key itself). */
export function topicLabel(key: string, lang: Lang): string {
  const l = TOPIC_LABELS[key];
  if (!l) return key;
  return lang === "en" ? l.en : l.zh;
}

/** Both labels plus the key, lowercased — the text a topic contributes to a
    search/ranking document, so either language reaches the same talks. */
export function topicSearchText(key: string): string {
  const l = TOPIC_LABELS[key];
  return (l ? `${key} ${l.zh} ${l.en}` : key).toLowerCase();
}
