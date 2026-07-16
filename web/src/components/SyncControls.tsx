import { useGistSync } from "@repus/gist-sync/react";
import { useI18n } from "../lib/i18n-store";
import { syncConfig } from "../lib/sync";

// GitHub-login + Gist-sync control for the user's follows. Site-level auth, but
// rendered on the schedule page next to the follow filter. Hidden entirely when
// no OAuth App is configured (VITE_GH_CLIENT_ID unset — e.g. local preview).
export default function SyncControls() {
  const gs = useGistSync();
  const { lang } = useI18n();
  const zh = lang !== "en";

  if (!syncConfig.clientId) return null;

  if (!gs.isLoggedIn) {
    return (
      <button
        className="filterchip"
        onClick={gs.login}
        title={zh ? "用 GitHub 登录，在多设备间同步你的关注" : "Sign in with GitHub to sync your follows across devices"}
      >
        <span className="filterchip__label">{zh ? "登录同步" : "Sign in to sync"}</span>
      </button>
    );
  }

  const statusText =
    gs.status === "syncing" ? (zh ? "同步中…" : "Syncing…")
      : gs.status === "pending" ? (zh ? "待同步" : "Pending")
        : gs.status === "conflict" ? (zh ? "有冲突" : "Conflict")
          : (zh ? "已同步" : "Synced");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {gs.conflict && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            fontSize: 13, padding: "4px 8px", borderRadius: 8,
            background: "var(--surface-2, rgba(127,127,127,0.12))",
          }}
        >
          <span>{zh ? "本地与云端都有改动：" : "Local and cloud both changed:"}</span>
          <button className="linklike" onClick={() => void gs.resolveConflict("local")}>{zh ? "保留本地" : "Keep local"}</button>
          <button className="linklike" onClick={() => void gs.resolveConflict("cloud")}>{zh ? "使用云端" : "Use cloud"}</button>
          <button className="linklike" onClick={() => void gs.resolveConflict("merge")}>{zh ? "合并" : "Merge"}</button>
        </div>
      )}
      <button
        className={`filterchip ${gs.status === "pending" || gs.status === "conflict" ? "is-on" : ""}`}
        onClick={() => void gs.syncNow()}
        title={gs.user?.login ? `@${gs.user.login} · ${zh ? "点击立即同步" : "click to sync now"}` : ""}
      >
        <span className="filterchip__label">{statusText}</span>
      </button>
      <button
        className="linklike"
        onClick={gs.logout}
        style={{ fontSize: 13, opacity: 0.75, background: "none", border: "none", cursor: "pointer" }}
      >
        {zh ? "退出" : "Sign out"}
      </button>
    </div>
  );
}
