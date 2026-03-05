"use client";

import { Matchup, TeamStanding } from "@/lib/types";
import { useScenario } from "@/context/ScenarioContext";

export default function MatchupToggle({
  matchup,
  teamMap,
}: {
  matchup: Matchup;
  teamMap: Record<number, TeamStanding>;
}) {
  const { toggle, getToggle } = useScenario();
  const winner = getToggle(matchup.week, matchup.matchup_id);

  const team1 = teamMap[matchup.roster_id_1];
  const team2 = teamMap[matchup.roster_id_2];
  const name1 = team1?.display_name ?? `Team ${matchup.roster_id_1}`;
  const name2 = team2?.display_name ?? `Team ${matchup.roster_id_2}`;

  if (matchup.completed) {
    const winner1 = (matchup.points_1 ?? 0) >= (matchup.points_2 ?? 0);
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-sleeper-surface/50 text-xs">
        <span className={winner1 ? "font-semibold text-green-400" : "text-sleeper-muted"}>
          {name1}
        </span>
        <span className="text-sleeper-muted text-[10px]">
          {matchup.points_1?.toFixed(1)} - {matchup.points_2?.toFixed(1)}
        </span>
        <span className={!winner1 ? "font-semibold text-green-400" : "text-sleeper-muted"}>
          {name2}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={() => toggle(matchup)}
      className="flex items-center gap-1 py-1.5 px-2 rounded bg-sleeper-surface hover:bg-sleeper-surface/80
                 text-xs transition-colors w-full"
    >
      <span
        className={`flex-1 text-left truncate rounded px-1 py-0.5 transition-colors
          ${winner === matchup.roster_id_1 ? "bg-sleeper-accent/20 text-sleeper-accent-light font-semibold" : "text-sleeper-muted"}
        `}
      >
        {name1}
      </span>
      <span className="text-sleeper-muted text-[10px] shrink-0">
        {winner === null ? "vs" : winner === matchup.roster_id_1 ? "W" : "L"}
      </span>
      <span
        className={`flex-1 text-right truncate rounded px-1 py-0.5 transition-colors
          ${winner === matchup.roster_id_2 ? "bg-sleeper-accent/20 text-sleeper-accent-light font-semibold" : "text-sleeper-muted"}
        `}
      >
        {name2}
      </span>
    </button>
  );
}
