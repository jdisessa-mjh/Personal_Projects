"use client";

import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SavedLeague } from "@/lib/types";
import LeagueInput from "@/components/LeagueInput";
import DashboardCard from "@/components/DashboardCard";

export default function Home() {
  const router = useRouter();
  const [leagues, setLeagues, loaded] = useLocalStorage<SavedLeague[]>(
    "sleeper-leagues",
    []
  );

  const addLeague = (leagueId: string) => {
    if (!leagues.some((l) => l.leagueId === leagueId)) {
      setLeagues((prev) => [
        ...prev,
        {
          leagueId,
          name: "",
          season: "",
          totalTeams: 0,
          lastViewed: Date.now(),
        },
      ]);
    }
    router.push(`/league/${leagueId}`);
  };

  const removeLeague = (leagueId: string) => {
    setLeagues((prev) => prev.filter((l) => l.leagueId !== leagueId));
  };

  const updateLeague = (updated: SavedLeague) => {
    setLeagues((prev) =>
      prev.map((l) => (l.leagueId === updated.leagueId ? updated : l))
    );
  };

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Playoff Predictor
        </h1>
        <p className="text-gray-500 text-sm">
          Enter your Sleeper league ID to see playoff odds and explore what-if
          scenarios.
        </p>
      </div>

      <div className="relative mb-8">
        <LeagueInput onSubmit={addLeague} buttonText="Add League" />
        <p className="text-gray-400 text-xs mt-2">
          Find your league ID in the Sleeper app under League Settings, or from
          the URL on the web.
        </p>
      </div>

      {loaded && leagues.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Your Leagues
          </h2>
          <div className="space-y-2">
            {leagues.map((league) => (
              <DashboardCard
                key={league.leagueId}
                league={league}
                onRemove={removeLeague}
                onUpdate={updateLeague}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
