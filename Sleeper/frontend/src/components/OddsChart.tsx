"use client";

import { TeamStanding } from "@/lib/types";
import { useScenario } from "@/context/ScenarioContext";

export default function OddsChart({
  standings: initialStandings,
}: {
  standings: TeamStanding[];
}) {
  const { state } = useScenario();
  const standings = state.standings && state.standings.length > 0
    ? state.standings
    : initialStandings;

  // Sort by playoff odds descending for the chart
  const sorted = [...standings].sort((a, b) => b.playoff_odds - a.playoff_odds);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold mb-4">Playoff Odds</h2>
      {sorted.map((team) => (
        <div key={team.roster_id} className="flex items-center gap-3">
          <span className="w-28 text-xs truncate text-right text-sleeper-muted">
            {team.display_name}
          </span>
          <div className="flex-1 h-6 bg-sleeper-surface rounded overflow-hidden relative">
            <div
              className="h-full rounded transition-all duration-500 ease-out"
              style={{
                width: `${team.playoff_odds}%`,
                background:
                  team.playoff_odds >= 75
                    ? "linear-gradient(90deg, #01b0a8, #00d4c8)"
                    : team.playoff_odds >= 40
                    ? "linear-gradient(90deg, #01b0a8, #01b0a8aa)"
                    : team.playoff_odds >= 10
                    ? "#8e92a4"
                    : "#ef4444",
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-semibold">
              {team.playoff_odds.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
