import { createContext, useContext } from "react";

export interface SyncUser { id: string; login: string; name?: string; avatarUrl?: string }
export interface SyncState {
  enabled: boolean;
  user: SyncUser | null;
  isLoggedIn: boolean;
  status: "signed_out" | "syncing" | "pending" | "synced" | "conflict" | "error";
  conflict: boolean;
  lastSyncedAt: string | null;
  login: () => void;
  logout: () => void;
  syncNow: () => Promise<void>;
  markLocalChange: () => void;
  resolveConflict: (choice: "local" | "cloud" | "merge") => Promise<void>;
}
export const SyncContext = createContext<SyncState | null>(null);
export function useSync(): SyncState {
  const state = useContext(SyncContext);
  if (!state) throw Error("SyncProvider is missing");
  return state;
}
