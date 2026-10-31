import { useI18n } from "../lib/i18n-store";
import Disclosure from "./Disclosure";

/** Source discrepancies remain readable with touch and keyboard, not only hover. */
export default function SourceNotes({ flags }: { flags?: string[] }) {
  const { t } = useI18n();
  if (!flags?.length) return null;
  return <Disclosure className="source-notes" label={t("forum.sourceNotes")} icon="alert">
    <ul>{flags.map((flag, i) => <li key={i}>{flag}</li>)}</ul>
  </Disclosure>;
}
