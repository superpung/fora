import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGistSync } from "@repus/gist-sync/react";
import { useI18n } from "../lib/i18n-store";
import { syncConfig } from "../lib/sync";
import { useFollowActions } from "../lib/follow-actions-store";
import { easeOut } from "../lib/motion";
import Icon, { type IconName } from "./Icon";
import ConfirmDialog from "./ConfirmDialog";
import type { ExportFormat } from "../lib/export";

// Global nav control that unifies the GitHub account (login + gist sync) and the
// active conference's follow actions (import / export / clear) into one dropdown.
// Account data/actions come from useGistSync(); follow actions are published by
// the in-conference bridge (useFollowActions), since the nav renders outside the
// conference providers. Everything is optional: with no OAuth configured it's
// just the follow menu, and outside a conference it's just the account menu.

const EXPORTS: { key: ExportFormat; labelKey: string; icon: IconName }[] = [
  { key: "ics", labelKey: "export.ics", icon: "calendar" },
  { key: "csv", labelKey: "export.csv", icon: "file" },
  { key: "md", labelKey: "export.md", icon: "file" },
  { key: "json", labelKey: "export.json", icon: "file" },
];

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
  const actions = useFollowActions();
  const { t, lang } = useI18n();
  const zh = lang !== "en";
  const [open, setOpen] = useState(false);
  const [expExport, setExpExport] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Collapse the export sub-list whenever the menu closes.
  useEffect(() => {
    if (!open) setExpExport(false);
  }, [open]);

  const hasSync = !!syncConfig.clientId;
  const loggedIn = gs.isLoggedIn;

  // Nothing to offer here at all.
  if (!hasSync && !actions) return null;

  // Signed out with no conference actions (e.g. the hub): a plain login button.
  if (hasSync && !loggedIn && !actions) {
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

  const gistHref = u?.login
    ? gs.gistId
      ? `https://gist.github.com/${u.login}/${gs.gistId}`
      : `https://gist.github.com/${u.login}`
    : null;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !actions) return;
    const res = await actions.importFile(file);
    setImportMsg({ ok: res.ok, text: res.message });
    window.setTimeout(() => setImportMsg(null), 3600);
  };

  const count = actions?.followedCount ?? 0;

  return (
    <div className="acct" ref={ref}>
      <button
        className="acct-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={zh ? "账户与关注" : "Account & follows"}
        aria-expanded={open}
      >
        {loggedIn ? avatar("acct-av", 26) : <Icon name="user" size={16} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="acct-pop"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: easeOut }}
          >
            {hasSync && loggedIn && (
              <>
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

                {gistHref && (
                  <a className="acct-row" href={gistHref} target="_blank" rel="noreferrer">
                    <Icon name="external" size={15} />
                    <span className="acct-row__label">{zh ? "查看 Gist" : "View gist"}</span>
                  </a>
                )}
              </>
            )}

            {hasSync && !loggedIn && (
              <button className="acct-row" onClick={gs.login}>
                <Icon name="github" size={15} />
                <span className="acct-row__label">{zh ? "用 GitHub 登录" : "Sign in with GitHub"}</span>
              </button>
            )}

            {actions && (
              <>
                {hasSync && <div className="acct-divider" />}
                <div className="acct-sectitle">
                  {zh ? "我的关注" : "My follows"}
                  {count > 0 && <span className="acct-sectitle__n">{count}</span>}
                </div>

                <button className="acct-row" onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" size={15} />
                  <span className="acct-row__label">{t("import.button")}</span>
                </button>

                {count > 0 && (
                  <>
                    <button
                      className="acct-row"
                      onClick={() => setExpExport((v) => !v)}
                      aria-expanded={expExport}
                    >
                      <Icon name="download" size={15} />
                      <span className="acct-row__label">{t("export.button")}</span>
                      <span className={`caret ${expExport ? "caret--up" : ""}`}>
                        <Icon name="chevron-down" size={14} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {expExport && (
                        <motion.div
                          className="acct-sub"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: easeOut }}
                        >
                          {EXPORTS.map((f) => (
                            <button
                              key={f.key}
                              className="acct-row acct-row--sub"
                              onClick={() => {
                                actions.runExport(f.key);
                                setOpen(false);
                              }}
                            >
                              <Icon name={f.icon} size={14} />
                              <span className="acct-row__label">{t(f.labelKey)}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      className="acct-row acct-row--danger"
                      onClick={() => { setOpen(false); setConfirmClear(true); }}
                    >
                      <Icon name="trash" size={15} />
                      <span className="acct-row__label">{t("home.clearMyFollows")}</span>
                    </button>
                  </>
                )}

                {importMsg && (
                  <div className={`acct-status acct-status--${importMsg.ok ? "ok" : "err"}`}>
                    {importMsg.text}
                  </div>
                )}
              </>
            )}

            {hasSync && loggedIn && (
              <>
                <div className="acct-divider" />
                <button
                  className="acct-row acct-row--danger"
                  onClick={() => { setOpen(false); setConfirmOut(true); }}
                >
                  <Icon name="log-out" size={15} />
                  <span className="acct-row__label">{zh ? "退出登录" : "Sign out"}</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />

      <ConfirmDialog
        open={confirmOut}
        title={zh ? "退出登录？" : "Sign out?"}
        message={
          zh
            ? "退出后将停止在此设备与云端同步，你的本地关注仍会保留。"
            : "Signing out stops syncing on this device. Your local follows stay on this device."
        }
        confirmLabel={zh ? "退出登录" : "Sign out"}
        cancelLabel={zh ? "取消" : "Cancel"}
        danger
        onConfirm={() => { setConfirmOut(false); gs.logout(); }}
        onCancel={() => setConfirmOut(false)}
      />

      <ConfirmDialog
        open={confirmClear}
        title={zh ? "清空关注？" : "Clear follows?"}
        message={
          zh
            ? "将移除当前会议下的所有关注，此操作无法撤销。"
            : "This removes every follow in the current conference. This cannot be undone."
        }
        confirmLabel={zh ? "清空" : "Clear"}
        cancelLabel={zh ? "取消" : "Cancel"}
        danger
        onConfirm={() => { setConfirmClear(false); actions?.clearAll(); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
