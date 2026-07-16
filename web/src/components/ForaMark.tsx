// The Fora brand mark: an "F" whose bars read as agenda rows (same as the
// favicon). Self-contained fixed-color tile, so it reads on any background.
export default function ForaMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="7" fill="#0b0b0c" />
      <rect x="9.25" y="8" width="4" height="16" rx="2" fill="#ffffff" />
      <rect x="9.25" y="8" width="13.5" height="4" rx="2" fill="#0070f3" />
      <rect x="9.25" y="14.5" width="9.5" height="4" rx="2" fill="#ffffff" />
    </svg>
  );
}
