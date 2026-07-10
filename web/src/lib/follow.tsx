import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// Personal-agenda state: which forums the user stars and which speakers they
// follow. Persisted to localStorage so a user's plan survives reloads. Speakers
// are keyed by name (the dataset has no stable person id); collisions are rare
// and acceptable for a "follow" convenience feature.

const FORUMS_KEY = "ccfchip.followed.forums";
const SPEAKERS_KEY = "ccfchip.followed.speakers";
const TALKS_KEY = "ccfchip.followed.talks";

// A talk has no stable id in the dataset, so we key it by its forum code plus
// its index within that forum: `${code}#${index}`.
export function talkId(code: string, index: number): string {
  return `${code}#${index}`;
}

function load(key: string): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function save(key: string, set: Set<string>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

interface FollowState {
  forums: Set<string>;
  speakers: Set<string>;
  talks: Set<string>;
  toggleForum: (code: string) => void;
  toggleSpeaker: (name: string) => void;
  toggleTalk: (id: string) => void;
  isForum: (code: string) => boolean;
  isSpeaker: (name: string) => boolean;
  isTalk: (id: string) => boolean;
  clearAll: () => void;
}

const FollowCtx = createContext<FollowState | null>(null);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [forums, setForums] = useState<Set<string>>(() => load(FORUMS_KEY));
  const [speakers, setSpeakers] = useState<Set<string>>(() => load(SPEAKERS_KEY));
  const [talks, setTalks] = useState<Set<string>>(() => load(TALKS_KEY));

  useEffect(() => save(FORUMS_KEY, forums), [forums]);
  useEffect(() => save(SPEAKERS_KEY, speakers), [speakers]);
  useEffect(() => save(TALKS_KEY, talks), [talks]);

  const toggleForum = useCallback((code: string) => {
    setForums((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback((name: string) => {
    setSpeakers((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const toggleTalk = useCallback((id: string) => {
    setTalks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setForums(new Set());
    setSpeakers(new Set());
    setTalks(new Set());
  }, []);

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
    }),
    [forums, speakers, talks, toggleForum, toggleSpeaker, toggleTalk, clearAll],
  );

  return <FollowCtx.Provider value={value}>{children}</FollowCtx.Provider>;
}

export function useFollow(): FollowState {
  const ctx = useContext(FollowCtx);
  if (!ctx) throw new Error("useFollow must be used within FollowProvider");
  return ctx;
}
