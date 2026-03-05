"use client";

import { Matchup, TeamStanding } from "@/lib/types";
import MatchupToggle from "./MatchupToggle";

export default function WeekPanel({
  week,
  matchups,
  teamMap,
}: {
  week: number;
  matchups: Matchup[];
  teamMap: Record<number, TeamStanding>;
}) {
  const allCompleted = matchups.every((m) => m.completed);

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-sleeper-muted uppercase tracking-wider flex items-center gap-2">
        Week {week}
        {allCompleted && (
          <span className="text-[10px] text-green-400/60 normal-case">Final</span>
        )}
      </h3>
      <div className="space-y-1">
        {matchups.map((m) => (
          <MatchupToggle
            key={`${m.week}-${m.matchup_id}`}
            matchup={m}
            teamMap={teamMap}
          />
        ))}
      </div>
    </div>
  );
}
