"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeagueInput() {
  const [leagueId, setLeagueId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = leagueId.trim();
    if (!trimmed) {
      setError("Please enter a league ID");
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      setError("League ID should be a number");
      return;
    }
    router.push(`/league/${trimmed}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={leagueId}
        onChange={(e) => {
          setLeagueId(e.target.value);
          setError("");
        }}
        placeholder="Enter Sleeper League ID"
        className="w-full px-4 py-3 rounded-lg bg-sleeper-surface border border-sleeper-muted/30
                   text-white placeholder-sleeper-muted focus:outline-none focus:border-sleeper-accent
                   text-center text-lg"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        className="w-full py-3 rounded-lg bg-sleeper-accent hover:bg-sleeper-accent-light
                   font-semibold transition-colors text-sleeper-darker"
      >
        View Playoff Odds
      </button>
      <p className="text-sleeper-muted text-xs">
        Find your league ID in the Sleeper app under League Settings, or from the URL on the web.
      </p>
    </form>
  );
}
