import { DraftOrderResponse, LeagueResponse, LockedMatchup, LockedMedian, ScenarioResponse } from "./types";

const BASE = "/api";

export async function fetchLeague(leagueId: string): Promise<LeagueResponse> {
  const res = await fetch(`${BASE}/league/${leagueId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Failed to fetch league (${res.status})`);
  }
  return res.json();
}

export async function runScenario(
  leagueId: string,
  lockedMatchups: LockedMatchup[],
  lockedMedians: LockedMedian[] = []
): Promise<ScenarioResponse> {
  const res = await fetch(`${BASE}/league/${leagueId}/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locked_matchups: lockedMatchups,
      locked_medians: lockedMedians,
    }),
  });
  if (!res.ok) {
    throw new Error(`Scenario failed (${res.status})`);
  }
  return res.json();
}

export async function fetchDraftOrder(leagueId: string): Promise<DraftOrderResponse> {
  const res = await fetch(`${BASE}/league/${leagueId}/draft-order`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Failed to fetch draft order (${res.status})`);
  }
  return res.json();
}
