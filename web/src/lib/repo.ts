// Project repository + a helper that builds a "new issue" URL with the bug
// template pre-filled via query params, so a report button lands the reporter on
// GitHub's issue form already populated. We also auto-capture page / conference /
// version / browser — the context that makes a report actionable and that users
// rarely include by hand.
export const REPO_URL = "https://github.com/superpung/fora";

export function bugReportUrl(zh: boolean, confId: string | undefined, page: string): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const conf = confId || "—";
  const body = zh
    ? `## 问题描述\n\n\n## 复现步骤\n1. \n2. \n3. \n\n## 期望结果\n\n\n## 实际结果\n\n\n---\n## 环境信息（请勿修改）\n- 页面：${page}\n- 会议：${conf}\n- 版本：v${__APP_VERSION__}\n- 浏览器：${ua}\n`
    : `## Description\n\n\n## Steps to reproduce\n1. \n2. \n3. \n\n## Expected\n\n\n## Actual\n\n\n---\n## Environment (please keep)\n- Page: ${page}\n- Conference: ${conf}\n- Version: v${__APP_VERSION__}\n- Browser: ${ua}\n`;
  const params = new URLSearchParams({ title: "[Bug] ", body, labels: "bug" });
  return `${REPO_URL}/issues/new?${params.toString()}`;
}
