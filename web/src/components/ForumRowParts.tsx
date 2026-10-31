import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Forum } from "../types";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import Icon from "./Icon";
import HeatValue from "./HeatValue";
import StarButton from "./StarButton";

export function ForumSummary({ forum: f, code, room, children }: {
  forum?: Forum; code: string; room?: string | null; children?: ReactNode;
}) {
  const { t: tr } = useI18n();
  const talks = f?.talks ?? [];
  const hasTalks = !!f?.detail_extracted && talks.length > 0;
  return <>
    <div className="frow__title">
      <span className="frow__code">{code}</span>
      <span className="frow__titletext">{f?.title.zh ?? code}</span>
    </div>
    <span className="frow__rc">
      <span className="frow__room">
        <Icon name="pin" size={11} /> {room}
      </span>
      {f?.category && (
        <span className="frow__cat">
          <Icon name="tag" size={12} /> {f.category.name.zh}
        </span>
      )}
      {f?.sponsor && (
        <span className="frow__sponsor">
          <Icon name="building" size={12} /> {f.sponsor}
        </span>
      )}
      {hasTalks ? (
        <span className="frow__count">
          <Icon name="keynotes" size={12} /> {tr("common.reportsCount", { n: talks.length })}
        </span>
      ) : (
        <span className="frow__pending">
          {tr(f?.agenda_status === "not_published"
            ? "common.agendaPending" : "common.pending")}
        </span>
      )}
    </span>
    {children}
  </>;
}

export function ForumActions({ code, onExpand, open = false }: {
  code: string; onExpand?: () => void; open?: boolean;
}) {
  const { id: confId } = useConference();
  const { isForum, toggleForum } = useFollow();
  const { t: tr } = useI18n();
  return (
    <div className="frow__actions">
      <HeatValue kind="forums" id={code} />
      <StarButton
        active={isForum(code)}
        onClick={() => toggleForum(code)}
        label={tr("home.saveForum", { code })}
        className="frow__star"
      />
      <Link
        to={`/${confId}/forum/${code}`}
        className="frow__enter"
        aria-label={tr("home.enterForum", { code })}
        title={tr("home.forumDetail")}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon name="arrow-right" size={16} />
      </Link>
      {onExpand && (
        <button
          className="frow__caretbtn"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          aria-expanded={open}
          aria-label={open ? tr("common.collapseReports") : tr("common.expandReports")}
        >
          <span className={`caret ${open ? "caret--up" : ""}`}>
            <Icon name="chevron-down" size={16} />
          </span>
        </button>
      )}
    </div>
  );
}
