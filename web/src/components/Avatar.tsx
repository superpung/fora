import type { CSSProperties } from "react";
import type { Person } from "../types";
import { dataAssetUrl } from "../lib/conferences";

// Speaker/chair avatar. Uses a real headshot when `photo.local_path` (or
// `source_url`) is available; otherwise renders a deterministic initials
// placeholder. Adapters attach portraits only when their source explicitly
// associates an image with that person; poster-only sources may have none.

function initials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  if (/[一-鿿]/.test(t)) return t.length <= 2 ? t : t.slice(-2);
  const parts = t.split(/\s+/).filter(Boolean);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Deterministic hue per name — the only thing about the placeholder that
// depends on who it is. Lightness is NOT decided here: see `.avatar--ph`.
function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export default function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  const src = person.photo?.local_path ? dataAssetUrl(person.photo.local_path) : person.photo?.source_url;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.34) };

  if (src) {
    return (
      <img
        className="avatar avatar--img"
        src={src}
        alt={person.name}
        width={size}
        height={size}
        loading="lazy"
      />
    );
  }

  // Only the hue is decided here. How light that hue has to be to stay readable
  // depends on the theme, so the stylesheet owns it — see `.avatar--ph`.
  return (
    <span
      className="avatar avatar--ph"
      style={{ ...style, "--av-h": hue(person.name) } as CSSProperties}
      aria-hidden="true"
    >
      {initials(person.name)}
    </span>
  );
}
