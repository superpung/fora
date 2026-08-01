import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useGistSync } from "@repus/gist-sync/react";
import { useI18n } from "../lib/i18n-store";
import { syncConfig } from "../lib/sync";
import { useReminders, LEAD_CHOICES } from "../lib/reminder-store";
import { useAi } from "../lib/ai-store";
import { useFollowActions } from "../lib/follow-actions-store";
import { bugReportUrl } from "../lib/repo";
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

const EXPORTS: { key: ExportFormat; labelKey: string; ext: string; icon: IconName }[] = [
  { key: "ics", labelKey: "export.ics", ext: ".ics", icon: "calendar" },
  { key: "csv", labelKey: "export.csv", ext: ".csv", icon: "file" },
  { key: "md", labelKey: "export.md", ext: ".md", icon: "file" },
  { key: "json", labelKey: "export.json", ext: ".json", icon: "file" },
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

/** The icon of a settings row that can be on or off.
 *
 *  Two things every switch in this menu owes the user: its own colour, so the
 *  menu doesn't read as one feature with three switches, and a gesture of its
 *  own when it comes on, so the row confirms the click where the eye already
 *  is (on the icon) and not only in the pill at the far right. The colour is
 *  the row's `--row-fg`; the gesture is named per icon — a bell rings, a
 *  calendar pops, a sparkle bursts.
 *
 *  Keyed on the state so React remounts the element: a CSS animation only
 *  replays on a fresh element. */
function RowIcon({ name, on, gesture, size = 15 }: {
  name: IconName;
  on: boolean;
  /** Animation class played on the way in — `ai-burst` is the shared AI mark's
      own gesture (app.css, "shared AI motion"). */
  gesture: "row-ring" | "row-pop" | "ai-burst";
  size?: number;
}) {
  return <Icon key={on ? "on" : "off"} name={name} size={size} className={on ? gesture : undefined} />;
}

export default function AccountMenu() {
  const gs = useGistSync();
  const actions = useFollowActions();
  const rem = useReminders();
  const ai = useAi();
  const { t, lang } = useI18n();
  const zh = lang !== "en";
  const loc = useLocation();
  // "New issue" link with the bug template pre-filled; rebuilt per route + language
  // so the auto-captured page URL stays current.
  const bugUrl = useMemo(() => {
    const confId = loc.pathname.split("/").filter(Boolean)[0];
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return bugReportUrl(zh, confId, `${origin}${loc.pathname}${loc.search}${loc.hash}`);
  }, [zh, loc.pathname, loc.search, loc.hash]);
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

  // The trigger ALWAYS opens the menu, signed in or out. This menu is not just
  // "account": it also holds site-wide settings (reminders, AI content), and
  // hiding those behind authentication would make them unreachable from the hub.
  // Signed out, signing in is simply the first row inside.

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
  /** How many of those follows resolve to a talk a file could list. */
  const exportable = actions?.exportableCount ?? 0;

  // Permission was denied at the OS/browser level — the switch cannot do
  // anything until the user changes it there, so it reads as a state, not a
  // paragraph of instructions.
  const remBlocked = rem.permission === "denied";
  const cycleLead = () => {
    const i = LEAD_CHOICES.indexOf(rem.prefs.leadMin);
    rem.setLead(LEAD_CHOICES[(i + 1) % LEAD_CHOICES.length]);
  };

  return (
    <div className="acct" ref={ref}>
      <button
        className="acct-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={zh ? "账户与设置" : "Account & settings"}
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
                          {EXPORTS.map((f) => {
                            // A followed forum whose agenda is not published
                            // yet resolves to no talks, so there is nothing for
                            // a calendar, a table or a Markdown list to hold.
                            // The row says so instead of being clickable and
                            // then doing nothing. The backup stays available —
                            // it stores the follows, not the talks.
                            const nothingToList = f.key !== "json" && exportable === 0;
                            return (
                              <button
                                key={f.key}
                                className="acct-row acct-row--sub"
                                disabled={nothingToList}
                                title={nothingToList ? t("export.nothingToList") : undefined}
                                onClick={() => {
                                  actions.runExport(f.key);
                                  setOpen(false);
                                }}
                              >
                                <Icon name={f.icon} size={14} />
                                <span className="acct-row__label">{t(f.labelKey)}</span>
                                {/* The row's state on the right, where every
                                    other row in this menu keeps it — not a hint
                                    paragraph (AGENTS.md, "UI copy / layout"). */}
                                <span className="acct-ext mono">
                                  {nothingToList ? t("export.noTalks") : f.ext}
                                </span>
                              </button>
                            );
                          })}
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

            {/* Site-wide settings. One line per setting: label on the left, its
                state on the right (a switch, or the current value). No hint
                paragraphs — a menu row that needs a sentence to be understood is
                the wrong control (AGENTS.md, "UI copy / layout rules"). */}
            <div className="acct-divider" />
            <div className="acct-sectitle">{t("settings.section")}</div>

            {rem.supported && (
              <>
                <button
                  className="acct-row acct-row--bell"
                  onClick={() => (rem.prefs.enabled ? rem.disable() : void rem.enable())}
                  aria-pressed={rem.prefs.enabled}
                  disabled={remBlocked}
                >
                  <RowIcon name="bell" on={rem.prefs.enabled && !remBlocked} gesture="row-ring" />
                  <span className="acct-row__label">{t("reminders.section")}</span>
                  {remBlocked ? (
                    <span className="acct-row__meta">{t("reminders.blocked")}</span>
                  ) : (
                    <>
                      {rem.prefs.enabled && rem.scheduledCount > 0 && (
                        <span className="acct-row__meta">{rem.scheduledCount}</span>
                      )}
                      <span className={`acct-switch ${rem.prefs.enabled ? "is-on" : ""}`} aria-hidden />
                    </>
                  )}
                </button>

                {rem.prefs.enabled && !remBlocked && (
                  <>
                    {/* Lead time cycles in place (5 → 10 → 15 → 30). Laying all
                        four out as chips overflowed the popover's width. */}
                    <button className="acct-row acct-row--bell" onClick={cycleLead}>
                      {/* The hand ticks round as the value changes, so the icon
                          takes part in the cycle instead of watching it. */}
                      <Icon key={rem.prefs.leadMin} name="clock" size={15} className="row-tick" />
                      <span className="acct-row__label">{t("reminders.lead")}</span>
                      {/* Rendered as a pill, not plain text, so it reads as
                          something you can press — the value changing on click
                          is the whole explanation the row gets. The new value
                          rolls in from above exactly like the language switch:
                          same control shape, same answer to a click. */}
                      <span className="acct-row__value">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={rem.prefs.leadMin}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.18, ease: easeOut }}
                          >
                            {t("reminders.min", { n: rem.prefs.leadMin })}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </button>
                    <button
                      className="acct-row acct-row--cal"
                      onClick={() => rem.setDayStart(!rem.prefs.dayStart)}
                      aria-pressed={rem.prefs.dayStart}
                    >
                      <RowIcon name="calendar" on={rem.prefs.dayStart} gesture="row-pop" />
                      <span className="acct-row__label">{t("reminders.dayStart")}</span>
                      <span className={`acct-switch ${rem.prefs.dayStart ? "is-on" : ""}`} aria-hidden />
                    </button>
                  </>
                )}
              </>
            )}

            {/* One site-wide switch for every AI-generated or AI-derived surface
                (summaries, semantic search, planner, topic map, similar talks).
                Off => source text only. The "may contain errors" disclaimer lives
                next to the generated content itself (AiMark), not here. */}
            <button className="acct-row acct-row--ai ai-hover" onClick={ai.toggle} aria-pressed={ai.enabled}>
              {/* The sparkle bursts rather than pops: this is the switch that
                  makes AI content appear, so it is the one place the mark's own
                  gesture should be felt. */}
              <RowIcon name="sparkle" on={ai.enabled} gesture="ai-burst" />
              <span className="acct-row__label">{t("ai.show")}</span>
              <span className={`acct-switch ${ai.enabled ? "is-on" : ""}`} aria-hidden />
            </button>

            {/* Bottom utility group: report a bug, then sign out kept LAST. */}
            <div className="acct-divider" />
            <a
              className="acct-row"
              href={bugUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              <Icon name="bug" size={15} />
              <span className="acct-row__label">{zh ? "问题反馈" : "Report a bug"}</span>
              <Icon name="external" size={13} className="acct-row__meta" aria-hidden />
            </a>

            {hasSync && loggedIn && (
              <button
                className="acct-row acct-row--danger"
                onClick={() => { setOpen(false); setConfirmOut(true); }}
              >
                <Icon name="log-out" size={15} />
                <span className="acct-row__label">{zh ? "退出登录" : "Sign out"}</span>
              </button>
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
