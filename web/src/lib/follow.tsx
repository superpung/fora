import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FollowCtx,
  FORUMS_KEY,
  SPEAKERS_KEY,
  TALKS_KEY,
  load,
  save,
  type FollowState,
} from "./follow-store";

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const [forums, setForums] = useState<Set<string>>(() => load(FORUMS_KEY));
  const [speakers, setSpeakers] = useState<Set<string>>(() => load(SPEAKERS_KEY));
  const [talks, setTalks] = useState<Set<string>>(() => load(TALKS_KEY));

  useEffect(() => save(FORUMS_KEY, forums), [forums]);
  useEffect(() => save(SPEAKERS_KEY, speakers), [speakers]);
  useEffect(() => save(TALKS_KEY, talks), [talks]);

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
