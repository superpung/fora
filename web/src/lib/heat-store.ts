import { createContext, useContext } from "react";
export interface ConferenceHeat { sha256: string; forums: Record<string, number>; talks: Record<string, number> }
export interface HeatSnapshot { generated_at: string; conferences: Record<string, ConferenceHeat> }
export interface HeatState {
  data: ConferenceHeat | null;
  status: "loading" | "ready" | "error";
  refreshing: boolean;
  updatedAt: string | null;
  nextRefreshAt: number;
}
export const HEAT_INTERVAL_MS = 300_000;
export const HeatContext = createContext<HeatState | null>(null);
export function useHeat() {
  const state = useContext(HeatContext);
  if (!state) throw Error("HeatProvider is missing");
  return state;
}
