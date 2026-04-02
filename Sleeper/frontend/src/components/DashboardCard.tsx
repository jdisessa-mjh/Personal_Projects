"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SavedLeague } from "@/lib/types";
import { fetchLeague } from "@/lib/api";

export default function DashboardCard({
  league,
  onRemove,
  onUpdate,
}: {
  league: SavedLeague;
  onRemove: (leagueId: string) => void;
  onUpdate: (league: SavedLeague) => void;
}) {
  const [loading, setLoading] = useState(!league.name);

  useEffect(() => {
    if (league.name) return;
    fetchLeague(league.leagueId)
      .then((data) => {
        onUpdate({
          ...league,
          name: data.league.name,
          season: data.league.season,
          totalTeams: data.league.total_teams,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [league.leagueId]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-brand/40 hover:shadow-sm transition-all">
      <Link
        href={`/league/${league.leagueId}`}
        className="flex items-center justify-between p-4"
      >
        <div className="min-w-0">
          {loading ? (
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
          ) : (
            <>
              <h3 className="font-semibold text-gray-900 truncate">
                {league.name || `League ${league.leagueId}`}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {league.season && `${league.season} Season`}
                {league.totalTeams > 0 && ` · ${league.totalTeams} teams`}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-brand text-sm font-medium">View →</span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(league.leagueId);
            }}
            className="text-gray-300 hover:text-red-400 transition-colors p-1"
            title="Remove league"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </Link>
    </div>
  );
}
