"use client";

import { useState } from "react";
import { Matchup, TeamStanding } from "@/lib/types";
import { useScenario } from "@/context/ScenarioContext";
import WeekPanel from "./WeekPanel";
import ScenarioStandings from "./ScenarioStandings";

export default function ScenarioBoard({
  matchups,
  standings,
  currentWeek,
  leagueAverageMatch = false,
  numPlayoffTeams,
  numByeTeams,
}: {
  matchups: Matchup[];
  standings: TeamStanding[];
  currentWeek: number;
  leagueAverageMatch?: boolean;
  numPlayoffTeams: number;
  numByeTeams: number;
}) {
  const { reset, hasToggles } = useScenario();

  const teamMap: Record<number, TeamStanding> = {};
  for (const t of standings) teamMap[t.roster_id] = t;

  // Group matchups by week
  const byWeek: Record<number, Matchup[]> = {};
  for (const m of matchups) {
    if (!byWeek[m.week]) byWeek[m.week] = [];
    byWeek[m.week].push(m);
  }
  const weeks = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b);

  // Default: completed weeks collapsed, current/future open
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => {
    const open = new Set<number>();
    for (const w of weeks) {
      const allCompleted = byWeek[w].every((m) => m.completed);
      if (!allCompleted) open.add(w);
    }
    return open;
  });

  const toggleWeek = (w: number) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Matchups</h2>
        {hasToggles && (
          <button
            onClick={reset}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded
                       border border-gray-300 hover:border-gray-400"
          >
            Reset Scenarios
          </button>
        )}
      </div>
      <div className="space-y-2">
        {weeks.map((w) => (
          <WeekPanel
            key={w}
            week={w}
            matchups={byWeek[w]}
            teamMap={teamMap}
            isOpen={openWeeks.has(w)}
            onToggle={() => toggleWeek(w)}
            leagueAverageMatch={leagueAverageMatch}
          />
        ))}
      </div>
      <p className="text-gray-400 text-xs mt-3">
        Click a matchup to cycle: unset (simulated) → Team A wins → Team B wins
        → unset
        {leagueAverageMatch && (
          <>
            {" · "}
            Click median chips to lock above/below median per team
          </>
        )}
      </p>

      <ScenarioStandings
        initialStandings={standings}
        numPlayoffTeams={numPlayoffTeams}
        numByeTeams={numByeTeams}
      />
    </div>
  );
}
