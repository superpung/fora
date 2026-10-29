import { buildConferenceViews, type ConferenceViews } from "./data";
import type { Conference } from "../types";

export interface ConferenceMeta {
  id: string;
  path: string;
  sha256: string;
  name: { zh: string; en?: string | null };
  edition?: string | null;
  start_date: string;
  end_date: string;
  timezone?: string | null;
  city?: string | null;
  venue?: string | null;
  forums: number;
  keynotes: number;
  days: number;
  /** Publication date of the last changed dataset, carried by the catalog. */
  updated_at?: string | null;
}


interface Catalog { schema_version: number; conferences: ConferenceMeta[] }
const DATA_BASE = (import.meta.env.VITE_DATA_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "/data";
const CACHE = "fora-data-v1";
export function dataAssetUrl(path: string): string { return `${DATA_BASE}${path}`; }
export let conferenceList: ConferenceMeta[] = [];
export let latestUpdatedAt: string | null = null;
export let catalogOffline = false;
export let previewRevision: string | null = null;
const views = new Map<string, Promise<ConferenceViews>>();

async function stored(url: string): Promise<Response | undefined> {
  if (typeof caches === "undefined") return undefined;
  return (await caches.open(CACHE)).match(url);
}
async function remember(url: string, response: Response): Promise<void> {
  try { if (typeof caches !== "undefined") await (await caches.open(CACHE)).put(url, response); }
  catch { /* Storage quotas must not prevent an online visit. */ }
}
function validateCatalog(value: unknown): Catalog {
  const data = value as Catalog;
  if (data?.schema_version !== 1 || !Array.isArray(data.conferences)) throw Error("Unsupported data catalog");
  const ids = new Set<string>();
  for (const meta of data.conferences) {
    if (!/^[a-z0-9-]+$/.test(meta.id) || ids.has(meta.id) || !meta.name?.zh ||
      !/^[a-f0-9]{64}$/.test(meta.sha256) || meta.path !== `conferences/${meta.id}/${meta.sha256}.json`) {
      throw Error("Invalid conference catalog entry");
    }
    ids.add(meta.id);
  }
  return data;
}

export async function initializeConferences(): Promise<void> {
  const requested = new URL(location.href).searchParams.get("dataVersion");
  if (requested === "current") sessionStorage.removeItem("fora.data-preview");
  else if (requested) {
    if (!/^[a-f0-9]{64}$/.test(requested)) throw Error("Invalid data preview revision");
    sessionStorage.setItem("fora.data-preview", requested);
  }
  previewRevision = sessionStorage.getItem("fora.data-preview");
  const url = `${DATA_BASE}/${previewRevision ? `releases/${previewRevision}.json` : "manifest.json"}`;
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-cache", signal: AbortSignal.timeout(10000) });
  } catch (error) {
    const cached = await stored(url);
    if (!cached) throw error;
    response = cached;
    catalogOffline = true;
  }
  if (!response.ok) throw Error(`Catalog HTTP ${response.status}`);
  const data = validateCatalog(await response.json());
  if (!catalogOffline) await remember(url, Response.json(data));
  conferenceList = data.conferences.sort((a, b) => b.start_date.localeCompare(a.start_date) || a.id.localeCompare(b.id));
  latestUpdatedAt = conferenceList.map(c => c.updated_at).filter(Boolean).sort().pop() ?? null;
}

export function hasConference(id: string | undefined): id is string {
  return !!id && conferenceList.some(c => c.id === id);
}
export function conferenceMeta(id: string): ConferenceMeta | undefined {
  return conferenceList.find(c => c.id === id);
}

async function readConference(meta: ConferenceMeta): Promise<ConferenceViews> {
  const url = `${DATA_BASE}/${meta.path}`;
  const cached = await stored(url);
  const response = cached ?? await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error(`Conference HTTP ${response.status}`);
  const bytes = await response.clone().arrayBuffer();
  const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map(n => n.toString(16).padStart(2, "0")).join("");
  if (digest !== meta.sha256) {
    if (typeof caches !== "undefined") await (await caches.open(CACHE)).delete(url);
    throw Error("Conference integrity check failed");
  }
  const raw = JSON.parse(new TextDecoder().decode(bytes)) as Conference;
  if (raw.id !== meta.id || raw.extra?.identity_version !== 1) throw Error("Unsupported conference data");
  await remember(url, response.clone());
  return buildConferenceViews(raw);
}

export function loadConferenceViews(id: string): Promise<ConferenceViews> {
  const meta = conferenceMeta(id);
  if (!meta) return Promise.reject(Error(`Unknown conference: ${id}`));
  const key = `${id}:${meta.sha256}`;
  let promise = views.get(key);
  if (!promise) {
    // React must see the same rejected promise to reach the error boundary.
    // The retry button reloads the page and starts a fresh request.
    promise = readConference(meta);
    views.set(key, promise);
  }
  return promise;
}
