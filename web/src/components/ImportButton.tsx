import { useRef, useState } from "react";
import Icon from "./Icon";
import { useFollow } from "../lib/follow-store";
import { parseFollowJSON } from "../lib/export";

// Import a previously-exported JSON backup (see toFollowJSON) and merge its
// follow ids into the current agenda. Shows a brief inline status instead of a
// blocking alert.
export default function ImportButton() {
  const { importFollows } = useFollow();
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
      const parsed = parseFollowJSON(await file.text());
      if (!parsed) return flash("err", "无法识别的文件，请选择本站导出的 .json 备份");
      if (parsed.conferenceMismatch)
        return flash("err", `该备份属于其他会议（${parsed.conference}），无法导入`);
      const n = importFollows(parsed.follows);
      flash("ok", `已导入 ${n} 项关注`);
    } catch {
      flash("err", "导入失败：文件无法解析");
    }
  };

  return (
    <div className="importbtn">
      <button className="linkbtn" onClick={() => inputRef.current?.click()} title="导入 .json 备份">
        <Icon name="upload" size={13} /> 导入
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
