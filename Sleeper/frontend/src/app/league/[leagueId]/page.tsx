"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { LeagueResponse, SavedLeague } from "@/lib/types";
import { fetchLeague } from "@/lib/api";
import { ScenarioProvider } from "@/context/ScenarioContext";
import StandingsTable from "@/components/StandingsTable";
import ScenarioBoard from "@/components/ScenarioBoard";
import OddsChart from "@/components/OddsChart";
import DraftOrder from "@/components/DraftOrder";

function saveToLocalStorage(data: LeagueResponse) {
  try {
    const stored = localStorage.getItem("sleeper-leagues");
    const leagues: SavedLeague[] = stored ? JSON.parse(stored) : [];
    const idx = leagues.findIndex(
      (l) => l.leagueId === data.league.league_id
    );
    const entry: SavedLeague = {
      leagueId: data.league.league_id,
      name: data.league.name,
      season: data.league.season,
      totalTeams: data.league.total_teams,
      lastViewed: Date.now(),
    };
    if (idx >= 0) {
      leagues[idx] = entry;
    } else {
      leagues.push(entry);
    }
    localStorage.setItem("sleeper-leagues", JSON.stringify(leagues));
  } catch {}
}

export default function LeaguePage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.leagueId as string;

  const [data, setData] = useState<LeagueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"overall" | "division">("overall");
  const [exporting, setExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchLeague(leagueId)
      .then((d) => {
        setData(d);
        saveToLocalStorage(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  const handleExport = async () => {
    if (!captureRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: "#f9fafb",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `playoff-odds-${leagueId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Failed to export screenshot");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-brand animate-pulse text-lg">
          Loading league data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            Error loading league
          </p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="text-brand hover:text-brand-dark text-sm"
        >
          ← Try another league
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hasDivisions = data.league.divisions !== null;

  return (
    <ScenarioProvider leagueId={leagueId}>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-gray-600 text-sm mb-3 inline-block"
          >
            ← Back
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {data.league.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mt-1">
                <span>{data.league.season} Season</span>
                <span>·</span>
                <span>Week {data.league.current_week}</span>
                <span>·</span>
                <span>{data.league.total_teams} teams</span>
                <span>·</span>
                <span>Top {data.league.num_playoff_teams} make playoffs</span>
                {data.league.league_average_match && (
                  <span className="inline-block bg-brand-50 text-brand-dark text-xs font-medium px-2 py-0.5 rounded">
                    League Median
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="self-start px-3 py-1.5 text-xs border border-gray-300 rounded-lg
                         hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-colors
                         disabled:opacity-50 whitespace-nowrap"
            >
              {exporting ? "Exporting..." : "📷 Export Screenshot"}
            </button>
          </div>

          {data.league.season_complete && (
            <div className="mt-3 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
              Season Complete — Rookie Draft Order
            </div>
          )}
        </header>

        {/* Main content */}
        <div className={`grid grid-cols-1 gap-6 ${
          !data.league.season_complete ? "lg:grid-cols-3" : ""
        }`}>
          <div className={`space-y-6 ${!data.league.season_complete ? "lg:col-span-2" : ""}`}>
            {/* Standings or Draft Order */}
            <section
              ref={captureRef}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              {data.league.season_complete ? (
                <>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Rookie Draft Order
                  </h2>
                  <DraftOrder leagueId={leagueId} />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Standings</h2>
                    {hasDivisions && (
                      <div className="flex text-xs border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setViewMode("overall")}
                          className={`px-3 py-1.5 transition-colors ${
                            viewMode === "overall"
                              ? "bg-brand text-white"
                              : "bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          Overall
                        </button>
                        <button
                          onClick={() => setViewMode("division")}
                          className={`px-3 py-1.5 transition-colors ${
                            viewMode === "division"
                              ? "bg-brand text-white"
                              : "bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          By Division
                        </button>
                      </div>
                    )}
                  </div>
                  <StandingsTable
                    standings={data.standings}
                    numPlayoffTeams={data.league.num_playoff_teams}
                    numByeTeams={data.league.num_bye_teams}
                    divisions={data.league.divisions}
                    viewMode={hasDivisions ? viewMode : "overall"}
                  />
                </>
              )}
            </section>

            {/* Scenario Board */}
            {!data.league.season_complete && (
              <section className="bg-white rounded-xl border border-gray-200 p-4">
                <ScenarioBoard
                  matchups={data.matchups}
                  standings={data.standings}
                  currentWeek={data.league.current_week}
                  leagueAverageMatch={data.league.league_average_match}
                  numPlayoffTeams={data.league.num_playoff_teams}
                  numByeTeams={data.league.num_bye_teams}
                />
              </section>
            )}
          </div>

          {/* Sidebar — only show during active season */}
          {!data.league.season_complete && (
            <div>
              <section className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
                <OddsChart standings={data.standings} />
              </section>
            </div>
          )}
        </div>
      </div>
    </ScenarioProvider>
  );
}
