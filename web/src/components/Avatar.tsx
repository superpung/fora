import type { Person } from "../types";

// Speaker/chair avatar. Uses a real headshot when `photo.local_path` (or
// `source_url`) is available; otherwise renders a deterministic initials
// placeholder. Extracting headshots from the source forum posters (one JPEG
// per forum, ~370 people) needs face detection + reliable person matching,
// which is high-effort / low-accuracy — so placeholders ship first and real
// images drop in later without touching call sites.

function initials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  if (/[一-鿿]/.test(t)) return t.length <= 2 ? t : t.slice(-2);
  const parts = t.split(/\s+/).filter(Boolean);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// deterministic muted hue per name (subtle, theme-agnostic via low alpha)
function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export default function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  const src = person.photo?.local_path || person.photo?.source_url || null;
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

  const h = hue(person.name);
  return (
    <span
      className="avatar avatar--ph"
      style={{
        ...style,
        background: `hsl(${h} 48% 50% / 0.16)`,
        color: `hsl(${h} 48% 52%)`,
      }}
      aria-hidden="true"
    >
      {initials(person.name)}
    </span>
  );
}
