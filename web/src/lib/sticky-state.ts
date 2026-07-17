import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

// Session-scoped store: values survive a component unmount/remount (e.g. a trip
// to a detail page and browser Back) but reset on a full page reload. Cleared
// only when the tab closes.
const store = new Map<string, unknown>();

/** Like useState, but the value is remembered across unmount/remount within the
    session, keyed by a stable string. Pairs with ScrollManager's POP scroll
    restoration so navigating into a detail page and back restores both the
    scroll position and the filters/tabs the user had set. Key filters by
    conference id so switching conferences starts fresh. */
export function useStickyState<T>(
  key: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [val, setVal] = useState<T>(() =>
    store.has(key)
      ? (store.get(key) as T)
      : typeof initial === "function"
        ? (initial as () => T)()
        : initial,
  );
  useEffect(() => {
    store.set(key, val);
  }, [key, val]);
  return [val, setVal];
}
