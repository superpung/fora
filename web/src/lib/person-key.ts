import type { Conference, Person } from "../types";

/** Only explicit source metadata can separate identities; do not infer them
    from affiliations, which can legitimately change between appearances. */
export function personKey(person: Person): string {
  // Distinguish a current name-only identity from a legacy follow that covered
  // every appearance of that name, including identities since separated.
  return person.extra?.identity_key ?? `name:${person.name}`;
}

/** Preserve every matching appearance when importing legacy name-based follows.
    Canonical keys are left alone so repeated reads cannot undo an unfollow. */
export function resolveSpeakerKeys(keys: Set<string>, conference: Conference): Set<string> {
  const people = [
    ...(conference.forums ?? []).flatMap((forum) => [
      ...(forum.chairs ?? []), ...(forum.talks ?? []).flatMap((talk) => talk.speakers ?? []),
    ]),
    ...(conference.days ?? []).flatMap((day) => day.blocks
      .filter((block) => block.kind === "keynotes")
      .flatMap((block) => (block.talks ?? []).flatMap((talk) => talk.speakers ?? []))),
  ];
  const byName = new Map<string, Set<string>>();
  for (const person of people) {
    const identities = byName.get(person.name) ?? new Set<string>();
    identities.add(personKey(person));
    byName.set(person.name, identities);
  }
  return new Set([...keys].flatMap((key) => [...(byName.get(key) ?? [key])]));
}
