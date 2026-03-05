"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LeagueResponse } from "@/lib/types";
import { fetchLeague } from "@/lib/api";
import { ScenarioProvider } from "@/context/ScenarioContext";
import StandingsTable from "@/components/StandingsTable";
import ScenarioBoard from "@/components/ScenarioBoard";
import OddsChart from "@/components/OddsChart";

export default function LeaguePage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;

  const [data, setData] = useState<LeagueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchLeague(leagueId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sleeper-accent animate-pulse text-lg">Loading league data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <div className="text-red-400 text-center">
          <p className="text-lg font-semibold mb-2">Error loading league</p>
          <p className="text-sm text-sleeper-muted">{error}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-sleeper-accent hover:text-sleeper-accent-light text-sm"
        >
          ← Try another league
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <ScenarioProvider leagueId={leagueId}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-sleeper-muted hover:text-white text-sm mb-4 inline-block"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">{data.league.name}</h1>
          <p className="text-sleeper-muted text-sm">
            {data.league.season} Season · Week {data.league.current_week} ·{" "}
            {data.league.total_teams} teams · Top {data.league.num_playoff_teams} make playoffs
            {data.league.league_average_match && (
              <span className="ml-2 inline-block bg-sleeper-accent/20 text-sleeper-accent text-xs font-medium px-2 py-0.5 rounded">
                League Median
              </span>
            )}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-sleeper-dark rounded-xl p-4">
              <h2 className="text-lg font-bold mb-4">Standings</h2>
              <StandingsTable
                standings={data.standings}
                numPlayoffTeams={data.league.num_playoff_teams}
              />
            </section>

            <section className="bg-sleeper-dark rounded-xl p-4">
              <ScenarioBoard
                matchups={data.matchups}
                standings={data.standings}
              />
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-sleeper-dark rounded-xl p-4">
              <OddsChart standings={data.standings} />
            </section>
          </div>
        </div>
      </div>
    </ScenarioProvider>
  );
}
