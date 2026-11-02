import { useI18n } from "../lib/i18n-store";

export default function CityLocation({ city }: { city: string }) {
  const { lang, t } = useI18n();
  return <span className="city-location">{lang === "en" ? <>{city}, {t("common.china")}</>
    : <>{t("common.china")}<span className="city-location__separator">·</span>{city}</>}</span>;
}
