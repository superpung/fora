import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGistSync } from "@repus/gist-sync/react";
import {
  FollowCtx,
  followKeys,
  load,
  save,
  type FollowState,
} from "./follow-store";
import { FOLLOWS_UPDATED } from "./sync";

// Follows are per-conference: the provider is mounted inside the conference
// layout keyed by conference id, so switching conferences remounts it with that
// conference's own persisted follows (and never mixes two agendas together).
export function FollowProvider({ confId, children }: { confId: string; children: React.ReactNode }) {
  const keys = useMemo(() => followKeys(confId), [confId]);
  const [forums, setForums] = useState<Set<string>>(() => load(keys.forums));
  const [speakers, setSpeakers] = useState<Set<string>>(() => load(keys.speakers));
  const [talks, setTalks] = useState<Set<string>>(() => load(keys.talks));

  useEffect(() => save(keys.forums, forums), [keys.forums, forums]);
  useEffect(() => save(keys.speakers, speakers), [keys.speakers, speakers]);
  useEffect(() => save(keys.talks, talks), [keys.talks, talks]);

  // Reload in-memory sets when a sync pull (or another tab) rewrites localStorage.
  useEffect(() => {
    const reload = () => {
      setForums(load(keys.forums));
      setSpeakers(load(keys.speakers));
      setTalks(load(keys.talks));
    };
    window.addEventListener(FOLLOWS_UPDATED, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(FOLLOWS_UPDATED, reload);
      window.removeEventListener("storage", reload);
    };
  }, [keys.forums, keys.speakers, keys.talks]);

  // Tell the sync engine after a local mutation (debounced push). Skip the mount
  // run so merely navigating into a conference doesn't schedule a push; a pull
  // that reloads to matching content is a no-op (localPending() is false).
  const { markLocalChange } = useGistSync();
  const markRef = useRef(markLocalChange);
  markRef.current = markLocalChange;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    markRef.current();
  }, [forums, speakers, talks]);

  const toggle = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
      (key: string) =>
        setter((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        }),
    [],
  );

  const toggleForum = useMemo(() => toggle(setForums), [toggle]);
  const toggleSpeaker = useMemo(() => toggle(setSpeakers), [toggle]);
  const toggleTalk = useMemo(() => toggle(setTalks), [toggle]);

  const clearAll = useCallback(() => {
    setForums(new Set());
    setSpeakers(new Set());
    setTalks(new Set());
  }, []);

  const importFollows = useCallback(
    (data: { forums: string[]; speakers: string[]; talks: string[] }) => {
      setForums((prev) => new Set([...prev, ...data.forums]));
      setSpeakers((prev) => new Set([...prev, ...data.speakers]));
      setTalks((prev) => new Set([...prev, ...data.talks]));
      return data.forums.length + data.speakers.length + data.talks.length;
    },
    [],
  );

  const value = useMemo<FollowState>(
    () => ({
      forums,
      speakers,
      talks,
      toggleForum,
      toggleSpeaker,
      toggleTalk,
      isForum: (c) => forums.has(c),
      isSpeaker: (n) => speakers.has(n),
      isTalk: (id) => talks.has(id),
      clearAll,
      importFollows,
    }),
    [forums, speakers, talks, toggleForum, toggleSpeaker, toggleTalk, clearAll, importFollows],
  );

  return <FollowCtx.Provider value={value}>{children}</FollowCtx.Provider>;
}
