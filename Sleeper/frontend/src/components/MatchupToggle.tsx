"use client";

import { Matchup, TeamStanding } from "@/lib/types";
import { useScenario } from "@/context/ScenarioContext";

function MedianChip({
  week,
  rosterId,
}: {
  week: number;
  rosterId: number;
}) {
  const { toggleMedian, getMedianToggle } = useScenario();
  const value = getMedianToggle(week, rosterId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMedian(week, rosterId);
  };

  let label: string;
  let className: string;
  if (value === true) {
    label = "▲ M";
    className = "text-green-700 bg-green-50 border-green-200";
  } else if (value === false) {
    label = "▼ M";
    className = "text-red-600 bg-red-50 border-red-200";
  } else {
    label = "~ M";
    className = "text-gray-400 bg-gray-50 border-gray-200";
  }

  return (
    <button
      onClick={handleClick}
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors hover:opacity-80 ${className}`}
      title={
        value === true
          ? "Above median (click to toggle)"
          : value === false
          ? "Below median (click to toggle)"
          : "Median: simulated (click to lock)"
      }
    >
      {label}
    </button>
  );
}

export default function MatchupToggle({
  matchup,
  teamMap,
  leagueAverageMatch = false,
}: {
  matchup: Matchup;
  teamMap: Record<number, TeamStanding>;
  leagueAverageMatch?: boolean;
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
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 text-sm">
        <span
          className={
            winner1 ? "font-semibold text-green-700" : "text-gray-400"
          }
        >
          {name1}
        </span>
        <span className="text-gray-300 text-xs">
          {matchup.points_1?.toFixed(1)} - {matchup.points_2?.toFixed(1)}
        </span>
        <span
          className={
            !winner1 ? "font-semibold text-green-700" : "text-gray-400"
          }
        >
          {name2}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => toggle(matchup)}
        className="flex items-center gap-1 py-2 px-3 rounded-lg bg-white border border-gray-200
                   hover:border-brand/30 text-sm transition-colors w-full active:scale-[0.99]"
      >
        <span
          className={`flex-1 text-left truncate rounded px-1.5 py-0.5 transition-colors ${
            winner === matchup.roster_id_1
              ? "bg-brand-50 text-brand-dark font-semibold"
              : "text-gray-500"
          }`}
        >
          {name1}
        </span>
        <span className="text-gray-300 text-xs shrink-0 px-1">
          {winner === null ? "vs" : winner === matchup.roster_id_1 ? "W" : "L"}
        </span>
        <span
          className={`flex-1 text-right truncate rounded px-1.5 py-0.5 transition-colors ${
            winner === matchup.roster_id_2
              ? "bg-brand-50 text-brand-dark font-semibold"
              : "text-gray-500"
          }`}
        >
          {name2}
        </span>
      </button>
      {leagueAverageMatch && (
        <div className="flex items-center justify-between px-3">
          <MedianChip week={matchup.week} rosterId={matchup.roster_id_1} />
          <span className="text-[10px] text-gray-300">median</span>
          <MedianChip week={matchup.week} rosterId={matchup.roster_id_2} />
        </div>
      )}
    </div>
  );
}
