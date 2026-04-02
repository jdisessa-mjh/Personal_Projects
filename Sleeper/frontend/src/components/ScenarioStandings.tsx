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

export default function ScenarioStandings({
  initialStandings,
  numPlayoffTeams,
  numByeTeams,
}: {
  initialStandings: TeamStanding[];
  numPlayoffTeams: number;
  numByeTeams: number;
}) {
  const { state, hasToggles } = useScenario();

  if (!hasToggles) return null;

  const standings =
    state.standings && state.standings.length > 0
      ? state.standings
      : initialStandings;

  const showBye = numByeTeams > 0;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Scenario Standings
        {state.loading && (
          <span className="ml-2 text-brand text-xs animate-pulse font-normal">
            Simulating...
          </span>
        )}
      </h3>

      {/* Mobile */}
      <div className="sm:hidden space-y-1.5">
        {standings.map((team, i) => {
          const inPlayoffs = i < numPlayoffTeams;
          return (
            <div
              key={team.roster_id}
              className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm ${
                inPlayoffs ? "bg-brand-50/30" : ""
              } ${i === numPlayoffTeams - 1 ? "border-b-2 border-b-brand/40 pb-2" : ""}`}
            >
              <span className="text-gray-400 text-xs w-5">{i + 1}</span>
              <span className="flex-1 truncate font-medium text-xs">{team.display_name}</span>
              <span className="text-gray-500 text-xs">
                {team.wins}-{team.losses}
              </span>
              <span
                className={`font-mono text-xs w-12 text-right ${
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
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 uppercase tracking-wider border-b border-gray-200">
              <th className="py-1.5 px-1.5 text-center w-8">#</th>
              <th className="py-1.5 px-1.5 text-left">Team</th>
              <th className="py-1.5 px-1.5 text-center w-16">Record</th>
              <th className="py-1.5 px-1.5 text-center w-14">PF</th>
              <th className="py-1.5 px-1.5 text-center w-28">Playoff %</th>
              {showBye && <th className="py-1.5 px-1.5 text-center w-16">Bye %</th>}
            </tr>
          </thead>
          <tbody>
            {standings.map((team, i) => {
              const inPlayoffs = i < numPlayoffTeams;
              const bc =
                i === numPlayoffTeams - 1
                  ? "border-b-2 border-b-brand/40"
                  : numByeTeams > 0 && i === numByeTeams - 1
                  ? "border-b-2 border-b-amber-300/60"
                  : "border-b border-gray-100";

              return (
                <tr
                  key={team.roster_id}
                  className={`${inPlayoffs ? "bg-brand-50/30" : ""}`}
                >
                  <td className={`py-1.5 px-1.5 text-center text-gray-400 ${bc}`}>
                    {i + 1}
                  </td>
                  <td className={`py-1.5 px-1.5 font-medium ${bc}`}>
                    {team.display_name}
                  </td>
                  <td className={`py-1.5 px-1.5 text-center text-gray-500 ${bc}`}>
                    {team.wins}-{team.losses}
                    {team.ties > 0 && `-${team.ties}`}
                  </td>
                  <td className={`py-1.5 px-1.5 text-center text-gray-500 ${bc}`}>
                    {team.points_for.toFixed(1)}
                  </td>
                  <td className={`py-1.5 px-1.5 ${bc}`}>
                    <div className="flex items-center gap-0.5 justify-center">
                      <div className="w-12">
                        <OddsBar value={team.playoff_odds} color="bg-brand" />
                      </div>
                      <span
                        className={`w-12 text-right font-mono ${
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
                    <td className={`py-1.5 px-1.5 text-center font-mono text-gray-500 ${bc}`}>
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
  );
}
