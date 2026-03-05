"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { LockedMatchup, Matchup, TeamStanding } from "@/lib/types";
import { runScenario } from "@/lib/api";

// Key for toggle map: "week-matchup_id"
type MatchupKey = string;

interface ScenarioState {
  toggles: Record<MatchupKey, number | null>; // null = unset, number = winner roster_id
  loading: boolean;
  standings: TeamStanding[] | null;
}

type Action =
  | { type: "TOGGLE"; key: MatchupKey; roster_id_1: number; roster_id_2: number }
  | { type: "RESET" }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_STANDINGS"; standings: TeamStanding[] };

function makeKey(week: number, matchup_id: number): string {
  return `${week}-${matchup_id}`;
}

function reducer(state: ScenarioState, action: Action): ScenarioState {
  switch (action.type) {
    case "TOGGLE": {
      const current = state.toggles[action.key] ?? null;
      let next: number | null;
      if (current === null) {
        next = action.roster_id_1;
      } else if (current === action.roster_id_1) {
        next = action.roster_id_2;
      } else {
        next = null;
      }
      return { ...state, toggles: { ...state.toggles, [action.key]: next } };
    }
    case "RESET":
      return { ...state, toggles: {}, standings: null };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_STANDINGS":
      return { ...state, standings: action.standings, loading: false };
    default:
      return state;
  }
}

interface ScenarioContextType {
  state: ScenarioState;
  toggle: (matchup: Matchup) => void;
  reset: () => void;
  getToggle: (week: number, matchup_id: number) => number | null;
}

const ScenarioCtx = createContext<ScenarioContextType | null>(null);

export function ScenarioProvider({
  leagueId,
  children,
}: {
  leagueId: string;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    toggles: {},
    loading: false,
    standings: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerScenario = useCallback(
    (toggles: Record<MatchupKey, number | null>) => {
      const locked: LockedMatchup[] = [];
      for (const [key, winner] of Object.entries(toggles)) {
        if (winner !== null) {
          const [week, matchup_id] = key.split("-").map(Number);
          locked.push({ week, matchup_id, winner_roster_id: winner });
        }
      }

      if (locked.length === 0) {
        dispatch({ type: "SET_STANDINGS", standings: [] as TeamStanding[] });
        return;
      }

      dispatch({ type: "SET_LOADING", loading: true });
      runScenario(leagueId, locked)
        .then((res) => dispatch({ type: "SET_STANDINGS", standings: res.standings }))
        .catch(() => dispatch({ type: "SET_LOADING", loading: false }));
    },
    [leagueId]
  );

  // Debounce scenario API calls
  const prevTogglesRef = useRef(state.toggles);
  useEffect(() => {
    if (prevTogglesRef.current === state.toggles) return;
    prevTogglesRef.current = state.toggles;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerScenario(state.toggles);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state.toggles, triggerScenario]);

  const toggle = useCallback((matchup: Matchup) => {
    const key = makeKey(matchup.week, matchup.matchup_id);
    dispatch({
      type: "TOGGLE",
      key,
      roster_id_1: matchup.roster_id_1,
      roster_id_2: matchup.roster_id_2,
    });
  }, []);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const getToggle = useCallback(
    (week: number, matchup_id: number) => {
      return state.toggles[makeKey(week, matchup_id)] ?? null;
    },
    [state.toggles]
  );

  return (
    <ScenarioCtx.Provider value={{ state, toggle, reset, getToggle }}>
      {children}
    </ScenarioCtx.Provider>
  );
}

export function useScenario() {
  const ctx = useContext(ScenarioCtx);
  if (!ctx) throw new Error("useScenario must be used within ScenarioProvider");
  return ctx;
}
