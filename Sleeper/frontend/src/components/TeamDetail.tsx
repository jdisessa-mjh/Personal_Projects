"use client";

import { Matchup, TeamStanding } from "@/lib/types";

export default function TeamDetail({
  team,
  matchups,
  standings,
  leagueAverageMatch,
}: {
  team: TeamStanding;
  matchups: Matchup[];
  standings: TeamStanding[];
  leagueAverageMatch: boolean;
}) {
  const teamMap: Record<number, TeamStanding> = {};
  for (const t of standings) teamMap[t.roster_id] = t;

  // Find matchups involving this team
  const teamMatchups = matchups
    .filter(
      (m) =>
        m.roster_id_1 === team.roster_id || m.roster_id_2 === team.roster_id
    )
    .sort((a, b) => a.week - b.week);

  if (teamMatchups.length === 0) {
    return (
      <div className="px-4 py-3 text-sm text-gray-400">
        No matchup data available.
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-4 py-3">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="text-gray-400 text-xs uppercase tracking-wider">
            <th className="py-1.5 text-left">Wk</th>
            <th className="py-1.5 text-left">Opponent</th>
            <th className="py-1.5 text-left hidden sm:table-cell">Opp Record</th>
            <th className="py-1.5 text-center">Result</th>
            <th className="py-1.5 text-right">Score</th>
            {leagueAverageMatch && (
              <th className="py-1.5 text-center">Median</th>
            )}
          </tr>
        </thead>
        <tbody>
          {teamMatchups.map((m) => {
            const isTeam1 = m.roster_id_1 === team.roster_id;
            const oppId = isTeam1 ? m.roster_id_2 : m.roster_id_1;
            const opp = teamMap[oppId];
            const oppName = opp?.display_name ?? `Team ${oppId}`;
            const myPts = isTeam1 ? m.points_1 : m.points_2;
            const oppPts = isTeam1 ? m.points_2 : m.points_1;

            if (!m.completed) {
              return (
                <tr key={m.week} className="border-t border-gray-100">
                  <td className="py-1.5 text-gray-400">{m.week}</td>
                  <td className="py-1.5">{oppName}</td>
                  <td className="py-1.5 text-gray-400 hidden sm:table-cell">
                    {opp ? `${opp.wins}-${opp.losses}` : "-"}
                  </td>
                  <td className="py-1.5 text-center text-gray-400 text-xs">
                    Upcoming
                  </td>
                  <td className="py-1.5 text-right text-gray-400">-</td>
                  {leagueAverageMatch && (
                    <td className="py-1.5 text-center text-gray-400">-</td>
                  )}
                </tr>
              );
            }

            const won =
              myPts !== null && oppPts !== null && myPts > oppPts;
            const tied =
              myPts !== null && oppPts !== null && myPts === oppPts;

            // Determine median result: get all scores for this week
            let medianResult: "W" | "L" | null = null;
            if (leagueAverageMatch && myPts !== null) {
              const weekMatchups = matchups.filter(
                (wm) => wm.week === m.week && wm.completed
              );
              const allScores: number[] = [];
              for (const wm of weekMatchups) {
                if (wm.points_1 !== null) allScores.push(wm.points_1);
                if (wm.points_2 !== null) allScores.push(wm.points_2);
              }
              allScores.sort((a, b) => a - b);
              const medianIdx = Math.floor(allScores.length / 2);
              const median = allScores[medianIdx] ?? 0;
              medianResult = myPts >= median ? "W" : "L";
            }

            return (
              <tr key={m.week} className="border-t border-gray-100">
                <td className="py-1.5 text-gray-400">{m.week}</td>
                <td className="py-1.5">{oppName}</td>
                <td className="py-1.5 text-gray-400 hidden sm:table-cell">
                  {opp ? `${opp.wins}-${opp.losses}` : "-"}
                </td>
                <td className="py-1.5 text-center">
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      won
                        ? "text-green-700 bg-green-50"
                        : tied
                        ? "text-gray-500 bg-gray-100"
                        : "text-red-600 bg-red-50"
                    }`}
                  >
                    {won ? "W" : tied ? "T" : "L"}
                  </span>
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  <span className={won ? "font-semibold" : ""}>
                    {myPts?.toFixed(1)}
                  </span>
                  <span className="text-gray-400 mx-1">-</span>
                  <span className={!won && !tied ? "font-semibold" : ""}>
                    {oppPts?.toFixed(1)}
                  </span>
                </td>
                {leagueAverageMatch && (
                  <td className="py-1.5 text-center">
                    {medianResult && (
                      <span
                        className={`text-xs font-semibold ${
                          medianResult === "W"
                            ? "text-green-700"
                            : "text-red-600"
                        }`}
                      >
                        {medianResult}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
