import { createContext, useContext } from "react";
export interface ConferenceHeat { sha256: string; forums: Record<string, number>; talks: Record<string, number> }
export interface HeatSnapshot { generated_at: string; conferences: Record<string, ConferenceHeat> }
export interface HeatState { data: ConferenceHeat | null; status: "loading" | "ready" | "error"; refresh: () => void }
export const HeatContext = createContext<HeatState | null>(null);
export function useHeat() {
  const state = useContext(HeatContext);
  if (!state) throw Error("HeatProvider is missing");
  return state;
}
