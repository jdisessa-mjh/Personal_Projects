"use client";

import { TeamStanding } from "@/lib/types";
import { useScenario } from "@/context/ScenarioContext";

function OddsBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-sleeper-darker rounded-full h-2 overflow-hidden">
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
}: {
  standings: TeamStanding[];
  numPlayoffTeams: number;
}) {
  const { state } = useScenario();
  const standings = state.standings && state.standings.length > 0
    ? state.standings
    : initialStandings;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-sleeper-muted text-xs uppercase tracking-wider border-b border-sleeper-surface">
            <th className="py-3 px-2 text-left">#</th>
            <th className="py-3 px-2 text-left">Team</th>
            <th className="py-3 px-2 text-center">Record</th>
            <th className="py-3 px-2 text-right">PF</th>
            <th className="py-3 px-2 text-right min-w-[120px]">Playoff %</th>
            <th className="py-3 px-2 text-right min-w-[100px]">#1 Seed %</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, i) => {
            const inPlayoffs = i < numPlayoffTeams;
            return (
              <tr
                key={team.roster_id}
                className={`border-b border-sleeper-surface/50 transition-colors
                  ${inPlayoffs ? "bg-sleeper-accent/5" : ""}
                  ${i === numPlayoffTeams - 1 ? "border-b-2 border-b-sleeper-accent/40" : ""}
                `}
              >
                <td className="py-3 px-2 text-sleeper-muted">{i + 1}</td>
                <td className="py-3 px-2 font-medium">
                  {team.display_name}
                </td>
                <td className="py-3 px-2 text-center text-sleeper-muted">
                  {team.wins}-{team.losses}
                  {team.ties > 0 ? `-${team.ties}` : ""}
                </td>
                <td className="py-3 px-2 text-right text-sleeper-muted">
                  {team.points_for.toFixed(1)}
                </td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-16">
                      <OddsBar value={team.playoff_odds} color="bg-sleeper-accent" />
                    </div>
                    <span className={`w-12 text-right font-mono text-xs
                      ${team.playoff_odds >= 90 ? "text-green-400" : ""}
                      ${team.playoff_odds <= 10 ? "text-red-400" : ""}
                      ${team.playoff_odds > 10 && team.playoff_odds < 90 ? "text-white" : ""}
                    `}>
                      {team.playoff_odds.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <span className="font-mono text-xs text-sleeper-muted">
                    {team.first_seed_odds.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {state.loading && (
        <div className="text-center py-2 text-sleeper-accent text-sm animate-pulse">
          Simulating...
        </div>
      )}
    </div>
  );
}
