"use client";

import { Matchup, TeamStanding } from "@/lib/types";
import MatchupToggle from "./MatchupToggle";

export default function WeekPanel({
  week,
  matchups,
  teamMap,
  isOpen,
  onToggle,
  leagueAverageMatch = false,
}: {
  week: number;
  matchups: Matchup[];
  teamMap: Record<number, TeamStanding>;
  isOpen: boolean;
  onToggle: () => void;
  leagueAverageMatch?: boolean;
}) {
  const allCompleted = matchups.every((m) => m.completed);
  const someCompleted = matchups.some((m) => m.completed);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Week {week}
          </span>
          {allCompleted && (
            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">
              Final
            </span>
          )}
          {someCompleted && !allCompleted && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
              In Progress
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100">
          <div className="pt-2" />
          {matchups.map((m) => (
            <MatchupToggle
              key={`${m.week}-${m.matchup_id}`}
              matchup={m}
              teamMap={teamMap}
              leagueAverageMatch={leagueAverageMatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
