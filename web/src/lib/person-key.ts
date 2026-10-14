import type { Conference, Person } from "../types";

/** Only explicit source metadata can separate identities; do not infer them
    from affiliations, which can legitimately change between appearances. */
export function personKey(person: Person): string {
  return person.extra?.identity_key ?? person.name;
}

/** Preserve the scope of older name-based follows when a source later records
    separate identities. A legacy follow covered every matching appearance. */
export function resolveSpeakerKeys(keys: Set<string>, conference: Conference): Set<string> {
  const resolved = new Set(keys);
  for (const forum of conference.forums ?? []) {
    const people = [...(forum.chairs ?? []), ...(forum.talks ?? []).flatMap((t) => t.speakers ?? [])];
    for (const person of people) {
      if (person.extra?.identity_key && keys.has(person.name)) {
        resolved.delete(person.name);
        resolved.add(personKey(person));
      }
    }
  }
  return resolved;
}
