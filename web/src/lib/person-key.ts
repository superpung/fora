import type { Person } from "../types";

/** Only explicit source metadata can separate identities; do not infer them
    from affiliations, which can legitimately change between appearances. */
export function personKey(person: Person): string {
  return person.extra?.identity_key ?? `name:${person.name}`;
}
