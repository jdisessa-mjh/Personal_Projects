"use client";

import { Matchup, TeamStanding } from "@/lib/types";
import { useScenario } from "@/context/ScenarioContext";
import WeekPanel from "./WeekPanel";

export default function ScenarioBoard({
  matchups,
  standings,
}: {
  matchups: Matchup[];
  standings: TeamStanding[];
}) {
  const { reset, state } = useScenario();

  const teamMap: Record<number, TeamStanding> = {};
  for (const t of standings) {
    teamMap[t.roster_id] = t;
  }

  // Group matchups by week
  const byWeek: Record<number, Matchup[]> = {};
  for (const m of matchups) {
    if (!byWeek[m.week]) byWeek[m.week] = [];
    byWeek[m.week].push(m);
  }
  const weeks = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b);

  const hasToggles = Object.values(state.toggles).some((v) => v !== null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Matchups</h2>
        {hasToggles && (
          <button
            onClick={reset}
            className="text-xs text-sleeper-muted hover:text-white transition-colors px-2 py-1 rounded
                       border border-sleeper-muted/30 hover:border-sleeper-muted"
          >
            Reset Scenarios
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {weeks.map((w) => (
          <WeekPanel key={w} week={w} matchups={byWeek[w]} teamMap={teamMap} />
        ))}
      </div>
      <p className="text-sleeper-muted text-xs mt-4">
        Click a matchup to cycle through: unset (simulated) → Team A wins → Team B wins → unset
      </p>
    </div>
  );
}
