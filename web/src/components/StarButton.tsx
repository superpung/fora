import Icon from "./Icon";

/** The one star in the app: same shape, same aria, wherever something can be
    added to or removed from the user's plan. It stops the click from reaching
    whatever the star sits on, so a row that is itself a link stays a link. */
export default function StarButton({
  active,
  onClick,
  label,
  className = "",
  size = 16,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
  size?: number;
}) {
  return (
    <button
      className={`star ${className} ${active ? "is-on" : ""}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      <Icon name="star" filled={active} size={size} />
    </button>
  );
}
