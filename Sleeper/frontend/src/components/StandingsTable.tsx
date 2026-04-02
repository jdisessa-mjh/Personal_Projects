"use client";

import { TeamStanding } from "@/lib/types";
import { useScenario } from "@/context/ScenarioContext";

function OddsBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export default function StandingsTable({
  standings: initialStandings,
  numPlayoffTeams,
  numByeTeams,
  divisions,
  viewMode,
}: {
  standings: TeamStanding[];
  numPlayoffTeams: number;
  numByeTeams: number;
  divisions: Record<string, number> | null;
  viewMode: "overall" | "division";
}) {
  const { state } = useScenario();
  const standings =
    state.standings && state.standings.length > 0
      ? state.standings
      : initialStandings;

  const showBye = numByeTeams > 0;

  // Group by division if needed
  const divisionGroups: { label: string; teams: TeamStanding[] }[] = [];
  if (viewMode === "division" && divisions) {
    const groups: Record<number, TeamStanding[]> = {};
    for (const team of standings) {
      const div = team.division ?? 0;
      if (!groups[div]) groups[div] = [];
      groups[div].push(team);
    }
    for (const [divNum, teams] of Object.entries(groups).sort(
      ([a], [b]) => Number(a) - Number(b)
    )) {
      divisionGroups.push({ label: `Division ${divNum}`, teams });
    }
  } else {
    divisionGroups.push({ label: "", teams: standings });
  }

  function borderClass(globalIdx: number) {
    if (viewMode === "overall" && globalIdx === numPlayoffTeams - 1)
      return "border-b-2 border-b-brand/40";
    if (
      viewMode === "overall" &&
      numByeTeams > 0 &&
      globalIdx === numByeTeams - 1
    )
      return "border-b-2 border-b-amber-300/60";
    return "border-b border-gray-100";
  }

  return (
    <div>
      {divisionGroups.map((group, gi) => (
        <div key={gi} className={gi > 0 ? "mt-6" : ""}>
          {group.label && (
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {group.label}
            </h3>
          )}

          {/* Mobile card view */}
          <div className="sm:hidden space-y-2">
            {group.teams.map((team, i) => {
              const globalIdx = standings.indexOf(team);
              const inPlayoffs = globalIdx < numPlayoffTeams;
              const hasBye = globalIdx < numByeTeams;
              const isDivLeader =
                viewMode === "division" && i === 0 && !!divisions;

              return (
                <div
                  key={team.roster_id}
                  className={`p-3 rounded-lg border ${
                    inPlayoffs
                      ? "bg-brand-50/50 border-brand/20"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-400 text-xs w-5">
                        {globalIdx + 1}
                      </span>
                      <span className="font-medium truncate">
                        {team.display_name}
                      </span>
                      {isDivLeader && (
                        <span className="text-brand text-xs">★</span>
                      )}
                      {hasBye && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-1 rounded">
                          BYE
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 shrink-0">
                      {team.wins}-{team.losses}
                      {team.ties > 0 && `-${team.ties}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1">
                      <OddsBar value={team.playoff_odds} color="bg-brand" />
                    </div>
                    <span
                      className={`text-xs font-mono w-14 text-right ${
                        team.playoff_odds >= 90
                          ? "text-green-600"
                          : team.playoff_odds <= 10
                          ? "text-red-500"
                          : "text-gray-700"
                      }`}
                    >
                      {team.playoff_odds.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-[180px]" />
                {showBye && <col className="w-[110px]" />}
              </colgroup>
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2.5 px-2 text-center">#</th>
                  <th className="py-2.5 pl-2 pr-1 text-left">Team</th>
                  <th className="py-2.5 px-3 text-center">Record</th>
                  <th className="py-2.5 px-3 text-center">PF</th>
                  <th className="py-2.5 px-3 text-center">Playoff %</th>
                  {showBye && <th className="py-2.5 px-3 text-center">Bye %</th>}
                </tr>
              </thead>
              <tbody>
                {group.teams.map((team, i) => {
                  const globalIdx = standings.indexOf(team);
                  const inPlayoffs = globalIdx < numPlayoffTeams;
                  const hasBye = globalIdx < numByeTeams;
                  const isDivLeader =
                    viewMode === "division" && i === 0 && !!divisions;
                  const bc = borderClass(globalIdx);

                  return (
                    <tr
                      key={team.roster_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        inPlayoffs ? "bg-brand-50/30" : ""
                      }`}
                    >
                      <td className={`py-2.5 px-2 text-center text-gray-400 ${bc}`}>
                        {globalIdx + 1}
                      </td>
                      <td className={`py-2.5 pl-2 pr-1 font-medium ${bc}`}>
                        <span className="flex items-center gap-1.5">
                          {team.display_name}
                          {isDivLeader && (
                            <span className="text-brand text-xs">★</span>
                          )}
                          {hasBye && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded font-normal">
                              BYE
                            </span>
                          )}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-center text-gray-500 ${bc}`}>
                        {team.wins}-{team.losses}
                        {team.ties > 0 && `-${team.ties}`}
                      </td>
                      <td className={`py-2.5 px-3 text-center text-gray-500 ${bc}`}>
                        {team.points_for.toFixed(1)}
                      </td>
                      <td className={`py-2.5 px-3 ${bc}`}>
                        <div className="flex items-center gap-0.5 justify-center">
                          <div className="w-16">
                            <OddsBar value={team.playoff_odds} color="bg-brand" />
                          </div>
                          <span
                            className={`w-14 text-right font-mono text-xs ${
                              team.playoff_odds >= 90
                                ? "text-green-600"
                                : team.playoff_odds <= 10
                                ? "text-red-500"
                                : "text-gray-700"
                            }`}
                          >
                            {team.playoff_odds.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      {showBye && (
                        <td className={`py-2.5 px-3 text-center font-mono text-xs text-gray-500 ${bc}`}>
                          {team.bye_odds.toFixed(1)}%
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {state.loading && (
        <div className="text-center py-2 text-brand text-sm animate-pulse">
          Simulating...
        </div>
      )}
    </div>
  );
}
