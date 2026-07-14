import type { SVGProps, ReactElement } from "react";

// Inline line-icon set (Geist / feather style: 24-grid, 1.5 stroke, currentColor).
// Self-contained SVG — no external icon dependency. Add new glyphs to PATHS.

export type IconName =
  | "star"
  | "chevron-down"
  | "chevron-right"
  | "arrow-left"
  | "arrow-right"
  | "pin"
  | "clock"
  | "search"
  | "x"
  | "alert"
  | "external"
  | "sun"
  | "moon"
  | "monitor"
  | "chip"
  | "registration"
  | "keynotes"
  | "forums"
  | "coffee"
  | "banquet"
  | "committee"
  | "calendar"
  | "users"
  | "user"
  | "building"
  | "link"
  | "check"
  | "download"
  | "upload"
  | "file"
  | "dot";

// Each entry is the inner markup of a 0 0 24 24 viewBox, stroked with currentColor.
const PATHS: Record<IconName, ReactElement> = {
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  "arrow-left": <path d="M19 12H5m6-7l-7 7 7 7" />,
  "arrow-right": <path d="M5 12h14m-6-7l7 7-7 7" />,
  pin: (
    <>
      <path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  x: <path d="M18 6L6 18M6 6l12 12" />,
  alert: (
    <>
      <path d="M12 3.5L2.5 20h19L12 3.5z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v.01" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8 8" />
      <path d="M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  // star handled specially below (fill toggles), keep an outline fallback here
  star: (
    <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.14 1 5.86L12 17l-5.25 2.76 1-5.86L3.5 9.7l5.9-.9L12 3.5z" />
  ),
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3" />
    </>
  ),
  registration: (
    <>
      <path d="M14.5 4.5l5 5L8 21l-5.5 1.5L4 17 14.5 4.5z" />
      <path d="M13 6l5 5" />
    </>
  ),
  keynotes: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
    </>
  ),
  forums: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z" />
      <path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 2.5v2M12 2.5v2" />
    </>
  ),
  banquet: (
    <>
      <path d="M6 3v7a3 3 0 0 0 6 0V3M9 3v18" />
      <path d="M17 3c-1.5 1-2 3-2 5s.5 3 2 3 2-1 2-3-.5-4-2-5zM17 11v10" />
    </>
  ),
  committee: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.5a3 3 0 0 1 0 5.5M17 15.5a5.5 5.5 0 0 1 3.5 4.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 2.5v4M16 2.5v4" />
    </>
  ),
  users: (
    <>
      <circle cx="8.5" cy="8" r="3.2" />
      <path d="M2.5 20a6 6 0 0 1 12 0" />
      <path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17 14.4a6 6 0 0 1 4.5 5.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
      <path d="M15 9h4a1 1 0 0 1 1 1v11M2.5 21h19" />
      <path d="M7.5 8h3M7.5 12h3M7.5 16h3" />
    </>
  ),
  link: (
    <>
      <path d="M9 15l6-6" />
      <path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
    </>
  ),
  check: <path d="M4 12.5l5 5 11-11" />,
  download: (
    <>
      <path d="M12 3v12m0 0l4-4m-4 4l-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V3m0 0l4 4m-4-4l-4 4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 17h7" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="2.5" />,
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  /** filled variant for star (follow toggle) */
  filled?: boolean;
}

export default function Icon({ name, size = 16, filled = false, ...rest }: IconProps) {
  const isStar = name === "star";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isStar && filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
