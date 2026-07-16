import { useEffect, useRef, useState } from "react";
import { useGistSync } from "@repus/gist-sync/react";
import { useI18n } from "../lib/i18n-store";
import { syncConfig } from "../lib/sync";
import Icon from "./Icon";

// GitHub-login + Gist-sync account control for the global nav. All data and
// actions come from useGistSync() — no sync logic lives here. Hidden entirely
// when no OAuth App is configured (VITE_GH_CLIENT_ID unset).

function relTime(iso: string | null, zh: boolean): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  if (ms < 60_000) return zh ? "刚刚" : "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}${zh ? " 分钟前" : " min ago"}`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}${zh ? " 小时前" : " h ago"}`;
  return `${Math.floor(ms / 86_400_000)}${zh ? " 天前" : " d ago"}`;
}

function initialsOf(u: { name?: string; login?: string } | null): string {
  return (u?.name || u?.login || "?").trim().slice(0, 2).toUpperCase();
}

export default function AccountMenu() {
  const gs = useGistSync();
  const { lang } = useI18n();
  const zh = lang !== "en";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!syncConfig.clientId) return null;

  if (!gs.isLoggedIn) {
    return (
      <button
        className="acct-login"
        onClick={gs.login}
        title={zh ? "用 GitHub 登录，在多设备间同步你的关注" : "Sign in with GitHub to sync your follows across devices"}
      >
        {zh ? "登录" : "Sign in"}
      </button>
    );
  }

  const u = gs.user;
  const avatar = (cls: string, px: number) =>
    u?.avatarUrl ? (
      <img className={cls} src={u.avatarUrl} alt="" width={px} height={px} />
    ) : (
      <span className={`${cls} acct-av--ph`}>{initialsOf(u)}</span>
    );

  const statusText =
    gs.status === "syncing" ? (zh ? "同步中…" : "Syncing…")
      : gs.status === "pending" ? (zh ? "待同步" : "Pending")
        : gs.status === "conflict" ? (zh ? "有冲突" : "Conflict")
          : (zh ? "已同步" : "Synced");

  return (
    <div className="acct" ref={ref}>
      <button
        className="acct-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={zh ? "账户" : "Account"}
        aria-expanded={open}
      >
        {avatar("acct-av", 26)}
      </button>

      {open && (
        <div className="acct-pop" role="menu">
          <div className="acct-id">
            {avatar("acct-av acct-av--lg", 38)}
            <div className="acct-idtext">
              <div className="acct-name">{u?.name || u?.login}</div>
              {u?.login && <div className="acct-sub">@{u.login}</div>}
            </div>
          </div>

          {gs.conflict ? (
            <div className="acct-conflict">
              <div className="acct-conflict__t">{zh ? "本地与云端都有改动" : "Local and cloud both changed"}</div>
              <div className="acct-conflict__b">
                <button onClick={() => void gs.resolveConflict("local")}>{zh ? "保留本地" : "Keep local"}</button>
                <button onClick={() => void gs.resolveConflict("cloud")}>{zh ? "用云端" : "Use cloud"}</button>
                <button onClick={() => void gs.resolveConflict("merge")}>{zh ? "合并" : "Merge"}</button>
              </div>
            </div>
          ) : (
            <button className="acct-row" onClick={() => void gs.syncNow()}>
              <Icon name="refresh" size={15} className={gs.status === "syncing" ? "spin" : undefined} />
              <span className="acct-row__label">{statusText}</span>
              {gs.lastSyncedAt && <span className="acct-row__meta">{relTime(gs.lastSyncedAt, zh)}</span>}
            </button>
          )}

          <button className="acct-row acct-row--danger" onClick={() => { gs.logout(); setOpen(false); }}>
            <Icon name="log-out" size={15} />
            <span className="acct-row__label">{zh ? "退出登录" : "Sign out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
