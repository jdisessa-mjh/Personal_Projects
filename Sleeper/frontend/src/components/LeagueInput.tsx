"use client";

import { useState } from "react";

function extractLeagueId(input: string): string {
  const trimmed = input.trim();
  // Handle Sleeper URLs like https://sleeper.com/leagues/123456789
  const urlMatch = trimmed.match(/sleeper\.com\/leagues\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  return trimmed;
}

export default function LeagueInput({
  onSubmit,
  placeholder = "Enter Sleeper League ID or paste URL",
  buttonText = "View Playoff Odds",
}: {
  onSubmit: (leagueId: string) => void;
  placeholder?: string;
  buttonText?: string;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const leagueId = extractLeagueId(input);
    if (!leagueId) {
      setError("Please enter a league ID");
      return;
    }
    if (!/^\d+$/.test(leagueId)) {
      setError("League ID should be a number");
      return;
    }
    onSubmit(leagueId);
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError("");
        }}
        placeholder={placeholder}
        className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-gray-300
                   text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2
                   focus:ring-brand/40 focus:border-brand text-sm"
      />
      <button
        type="submit"
        className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark
                   text-white font-medium transition-colors text-sm whitespace-nowrap"
      >
        {buttonText}
      </button>
      {error && (
        <p className="absolute mt-12 text-red-500 text-xs">{error}</p>
      )}
    </form>
  );
}
