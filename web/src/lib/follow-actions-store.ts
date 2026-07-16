import { createContext, useContext } from "react";
import type { ExportFormat } from "./export";

// A site-wide "slot" that lets the conference layer publish its follow actions
// (import / export / clear) up to the global account menu in the nav. The nav
// (and its account menu) render OUTSIDE the conference data providers, so they
// can't call useConference()/useFollow() directly. Instead, a bridge mounted
// inside those providers registers a ready-to-call API here; the account menu
// reads it and shows the actions only while a conference is active.

export interface FollowActionsApi {
  /** forums + speakers + talks currently followed in this conference. */
  followedCount: number;
  /** Run an export in the given format (no-op when nothing is followed). */
  runExport: (fmt: ExportFormat) => void;
  /** Merge a previously-exported JSON backup; resolves to a status message. */
  importFile: (file: File) => Promise<{ ok: boolean; message: string }>;
  /** Clear every follow in this conference. */
  clearAll: () => void;
}

export interface FollowActionsSlot {
  actions: FollowActionsApi | null;
  register: (api: FollowActionsApi | null) => void;
}

export const FollowActionsCtx = createContext<FollowActionsSlot>({
  actions: null,
  register: () => {},
});

/** The active conference's follow actions, or null outside a conference. */
export function useFollowActions(): FollowActionsApi | null {
  return useContext(FollowActionsCtx).actions;
}

/** Used by the in-conference bridge to publish/withdraw its actions. */
export function useRegisterFollowActions(): (api: FollowActionsApi | null) => void {
  return useContext(FollowActionsCtx).register;
}
