import { useCallback, useState } from "react";

// Sibling of sticky-state: that one remembers a value for the session (a trip to
// a detail page and back), this one remembers it for good. Use it for a choice
// the reader made about how they want to read the site — during a conference the
// app is opened and reloaded a dozen times a day, and being handed back the
// default every time is being asked to answer the same question every time.
// Follows already persist; the view onto them should too.
//
// Keys are namespaced by conference id, like the follow keys, so two conferences
// don't share one preference.

function read<T>(key: string): T | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

/** Like useState, but the value is read from and written to localStorage.
    `accept` filters what comes back out of storage, so a stale or hand-edited
    value can never put the page into a state the code doesn't handle.

    Only an explicit set writes: merely rendering the page — including opening
    someone else's link that names a view — leaves what the reader saved alone. */
export function useSavedState<T>(
  key: string,
  initial: T,
  accept: (v: unknown) => v is T,
): [T, (next: T) => void] {
  const [val, setVal] = useState<T>(() => {
    const stored = read<unknown>(key);
    return accept(stored) ? stored : initial;
  });
  const set = useCallback(
    (next: T) => {
      setVal(next);
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* quota / privacy mode — the page just forgets, as it did before */
      }
    },
    [key],
  );
  return [val, set];
}

/** Guard builder for a small string union: `oneOf("all", "mine")`. */
export function oneOf<T extends string>(...allowed: T[]): (v: unknown) => v is T {
  return (v: unknown): v is T => typeof v === "string" && (allowed as string[]).includes(v);
}
