import { useRef, useState } from "react";
import Icon from "./Icon";
import { useFollow } from "../lib/follow-store";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { parseFollowJSON } from "../lib/export";

// Import a previously-exported JSON backup (see toFollowJSON) and merge its
// follow ids into the current agenda. Shows a brief inline status instead of a
// blocking alert.
export default function ImportButton() {
  const { importFollows } = useFollow();
  const { id: currentId } = useConference();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const flash = (kind: "ok" | "err", text: string) => {
    setStatus({ kind, text });
    window.setTimeout(() => setStatus(null), 3200);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-selected later
    if (!file) return;
    try {
      const parsed = parseFollowJSON(await file.text(), currentId);
      if (!parsed) return flash("err", t("import.badFile"));
      if (parsed.conferenceMismatch)
        return flash("err", t("import.mismatch", { conf: parsed.conference ?? "" }));
      const n = importFollows(parsed.follows);
      flash("ok", t("import.done", { n }));
    } catch {
      flash("err", t("import.failed"));
    }
  };

  return (
    <div className="importbtn">
      <button className="linkbtn" onClick={() => inputRef.current?.click()} title={t("import.title")}>
        <Icon name="upload" size={13} /> {t("import.button")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={onFile}
      />
      {status && (
        <span className={`importbtn__status importbtn__status--${status.kind}`}>{status.text}</span>
      )}
    </div>
  );
}
