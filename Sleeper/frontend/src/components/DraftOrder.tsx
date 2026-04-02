"use client";

import { useEffect, useState } from "react";
import { DraftOrderResponse, DraftPick } from "@/lib/types";
import { fetchDraftOrder } from "@/lib/api";

export default function DraftOrder({ leagueId }: { leagueId: string }) {
  const [data, setData] = useState<DraftOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDraftOrder(leagueId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [leagueId]);

  if (loading) {
    return (
      <div className="text-brand animate-pulse text-sm py-4 text-center">
        Loading draft order...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm py-4 text-center">
        Failed to load draft order: {error}
      </div>
    );
  }

  if (!data || data.picks.length === 0) return null;

  // Group picks by round
  const byRound: Record<number, DraftPick[]> = {};
  for (const pick of data.picks) {
    if (!byRound[pick.round]) byRound[pick.round] = [];
    byRound[pick.round].push(pick);
  }
  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div>
      <div className="text-xs text-gray-400 mb-3">
        {data.season} Rookie Draft
      </div>

      {rounds.map((rd) => (
        <div key={rd} className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Round {rd}
          </h3>

          {/* Mobile */}
          <div className="sm:hidden space-y-1">
            {byRound[rd].map((pick) => {
              const traded = pick.owner_roster_id !== pick.original_roster_id;
              return (
                <div
                  key={pick.overall}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm ${
                    traded ? "bg-amber-50/50" : "bg-white"
                  }`}
                >
                  <span className="text-brand font-bold text-xs w-7 text-center">
                    {rd}.{String(pick.pick).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-medium text-xs truncate">
                    {pick.owner_name}
                  </span>
                  {traded && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                      via {pick.original_name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <tbody>
                {byRound[rd].map((pick) => {
                  const traded = pick.owner_roster_id !== pick.original_roster_id;
                  return (
                    <tr
                      key={pick.overall}
                      className={`border-b border-gray-100 ${traded ? "bg-amber-50/30" : ""}`}
                    >
                      <td className="py-1.5 px-2 text-center font-bold text-brand w-16">
                        {rd}.{String(pick.pick).padStart(2, "0")}
                      </td>
                      <td className="py-1.5 px-2 font-medium">
                        {pick.owner_name}
                      </td>
                      <td className="py-1.5 px-2 text-right text-xs text-gray-400">
                        {traded ? (
                          <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            via {pick.original_name}
                          </span>
                        ) : (
                          <span className="text-gray-300">OWN</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-gray-400 text-xs mt-2">
        Traded picks highlighted in amber. Draft order based on regular season
        standings — actual order may shift based on playoff results.
      </p>
    </div>
  );
}
