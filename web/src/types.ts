// Types mirror schema/schema.json (a self-designed model, not compatible with any existing format).
export type Status = "confirmed" | "tbd" | "unknown";

export interface I18n {
  zh: string;
  en?: string | null;
}

export interface Asset {
  local_path?: string | null;
  source_url?: string | null;
}

export interface Person {
  name: string;
  name_en?: string | null;
  affiliation_raw?: string | null;
  organization?: string | null;
  title?: string | null;
  honorifics?: string[];
  photo?: Asset;
  bio?: string | null;
  chair_role?: string | null;
}

export interface Venue {
  id: string;
  name: I18n;
  type?: "main" | "hotel" | "other";
  city?: string;
  note?: string;
}

export interface Organization {
  name: I18n;
  role: "host" | "co_host" | "support" | "sponsor";
  sponsor_tier?: string | null;
  logo?: Asset;
}

export interface Committee {
  role: I18n;
  ordering_note?: string | null;
  members: Person[];
}

export interface Talk {
  order?: number | null;
  title?: I18n;
  title_status?: Status;
  start?: string | null;
  end?: string | null;
  speakers?: Person[];
  abstract?: string | null;
  abstract_status?: Status;
  type?: "keynote" | "invited" | "talk" | "opening" | "other";
  flags?: string[];
}

export interface ForumEntry {
  forum_code: string;
  room?: string | null;
}

export interface Meeting {
  name: I18n;
  room?: string | null;
  start?: string | null;
  end?: string | null;
}

export type BlockKind =
  | "registration"
  | "keynotes"
  | "forums"
  | "break"
  | "banquet"
  | "committee_meetings"
  | "other";

export interface Break {
  name: string;
  start?: string | null;
  end?: string | null;
}

export interface Block {
  id?: string;
  kind: BlockKind;
  title?: I18n;
  start?: string | null;
  end?: string | null;
  location?: string | null;
  note?: string | null;
  breaks?: Break[];
  talks?: Talk[];
  forum_entries?: ForumEntry[];
  meetings?: Meeting[];
}

export interface Day {
  date: string;
  venue_id?: string | null;
  overview?: {
    morning?: string[];
    afternoon?: string[];
    evening?: string[];
  };
  blocks: Block[];
}

export interface ForumCategory {
  key?: string | null;
  name: I18n;
}

export interface Forum {
  code: string;
  title: I18n;
  category?: ForumCategory;
  sponsor?: string | null;
  series_part?: string | null;
  day_date?: string | null;
  session_period?: "morning" | "afternoon" | "evening" | null;
  room?: string | null;
  description?: string | null;
  chairs?: Person[];
  talks?: Talk[];
  poster?: Asset | null;
  source_url?: string | null;
  detail_extracted?: boolean;
  flags?: string[];
}

export interface Conference {
  id: string;
  source_url?: string;
  name: I18n;
  edition?: string;
  start_date: string;
  end_date: string;
  timezone?: string;
  contact?: { email?: string };
  links?: Record<string, string>;
  venues?: Venue[];
  organizations?: Organization[];
  committees?: Committee[];
  days?: Day[];
  forums?: Forum[];
  extraction?: Record<string, unknown>;
}
