export interface SyncBundle {
  app: "fora";
  version: 1;
  follows: string[];
  prefs: Record<string, string>;
}
export interface SyncRecord {
  revision: number;
  bundle: SyncBundle;
  updated_at: string;
}
export const emptyBundle = (): SyncBundle => ({ app: "fora", version: 1, follows: [], prefs: {} });
export const fingerprint = (bundle: SyncBundle): string => JSON.stringify([
  [...new Set(bundle.follows)].sort(), Object.entries(bundle.prefs).sort(([a], [b]) => a.localeCompare(b)),
]);

/** Apply local changes since the common base to the latest remote state. */
export function mergeBundles(base: SyncBundle, local: SyncBundle, remote: SyncBundle) {
  const before = new Set(base.follows), after = new Set(local.follows), follows = new Set(remote.follows);
  for (const key of before) if (!after.has(key)) follows.delete(key);
  for (const key of after) if (!before.has(key)) follows.add(key);
  const prefs = { ...remote.prefs }, conflicts: string[] = [];
  for (const key of new Set([...Object.keys(base.prefs), ...Object.keys(local.prefs)])) {
    const b = base.prefs[key], l = local.prefs[key], r = remote.prefs[key];
    if (l === b) continue;
    if (r !== b && r !== l) conflicts.push(key);
    if (l === undefined) delete prefs[key]; else prefs[key] = l;
  }
  return { bundle: { app: "fora", version: 1, follows: [...follows].sort(), prefs } as SyncBundle, conflicts };
}
