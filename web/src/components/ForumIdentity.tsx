/** The same source identifier badge on every HTML surface. */
export function ForumCode({ code, className = "" }: { code: string; className?: string }) {
  return <span className={`code-tag ${className}`}>{code}</span>;
}

export default function ForumIdentity({ code, name }: { code?: string; name: string }) {
  return <span className="forum-identity">{code && <><ForumCode code={code} />{" "}</>}{name}</span>;
}
