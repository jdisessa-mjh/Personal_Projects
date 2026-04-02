"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { LockedMatchup, LockedMedian, Matchup, TeamStanding } from "@/lib/types";
import { runScenario } from "@/lib/api";

type MatchupKey = string;
type MedianKey = string;

interface ScenarioState {
  toggles: Record<MatchupKey, number | null>;
  medianToggles: Record<MedianKey, boolean | null>; // true=above, false=below, null=unset
  loading: boolean;
  standings: TeamStanding[] | null;
}

type Action =
  | { type: "TOGGLE"; key: MatchupKey; roster_id_1: number; roster_id_2: number }
  | { type: "TOGGLE_MEDIAN"; key: MedianKey }
  | { type: "RESET" }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_STANDINGS"; standings: TeamStanding[] };

function makeKey(week: number, matchup_id: number): string {
  return `${week}-${matchup_id}`;
}

function makeMedianKey(week: number, roster_id: number): string {
  return `${week}-${roster_id}`;
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
    case "TOGGLE_MEDIAN": {
      const current = state.medianToggles[action.key] ?? null;
      let next: boolean | null;
      if (current === null) {
        next = true;
      } else if (current === true) {
        next = false;
      } else {
        next = null;
      }
      return { ...state, medianToggles: { ...state.medianToggles, [action.key]: next } };
    }
    case "RESET":
      return { ...state, toggles: {}, medianToggles: {}, standings: null };
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
  toggleMedian: (week: number, rosterId: number) => void;
  reset: () => void;
  getToggle: (week: number, matchup_id: number) => number | null;
  getMedianToggle: (week: number, rosterId: number) => boolean | null;
  hasToggles: boolean;
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
    medianToggles: {},
    loading: false,
    standings: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerScenario = useCallback(
    (toggles: Record<MatchupKey, number | null>, medianToggles: Record<MedianKey, boolean | null>) => {
      const locked: LockedMatchup[] = [];
      for (const [key, winner] of Object.entries(toggles)) {
        if (winner !== null) {
          const [week, matchup_id] = key.split("-").map(Number);
          locked.push({ week, matchup_id, winner_roster_id: winner });
        }
      }

      const lockedMedians: LockedMedian[] = [];
      for (const [key, above] of Object.entries(medianToggles)) {
        if (above !== null) {
          const [week, roster_id] = key.split("-").map(Number);
          lockedMedians.push({ week, roster_id, above_median: above });
        }
      }

      if (locked.length === 0 && lockedMedians.length === 0) {
        dispatch({ type: "SET_STANDINGS", standings: [] as TeamStanding[] });
        return;
      }

      dispatch({ type: "SET_LOADING", loading: true });
      runScenario(leagueId, locked, lockedMedians)
        .then((res) => dispatch({ type: "SET_STANDINGS", standings: res.standings }))
        .catch(() => dispatch({ type: "SET_LOADING", loading: false }));
    },
    [leagueId]
  );

  const prevTogglesRef = useRef(state.toggles);
  const prevMedianRef = useRef(state.medianToggles);
  useEffect(() => {
    if (prevTogglesRef.current === state.toggles && prevMedianRef.current === state.medianToggles) return;
    prevTogglesRef.current = state.toggles;
    prevMedianRef.current = state.medianToggles;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerScenario(state.toggles, state.medianToggles);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state.toggles, state.medianToggles, triggerScenario]);

  const toggle = useCallback((matchup: Matchup) => {
    const key = makeKey(matchup.week, matchup.matchup_id);
    dispatch({
      type: "TOGGLE",
      key,
      roster_id_1: matchup.roster_id_1,
      roster_id_2: matchup.roster_id_2,
    });
  }, []);

  const toggleMedian = useCallback((week: number, rosterId: number) => {
    const key = makeMedianKey(week, rosterId);
    dispatch({ type: "TOGGLE_MEDIAN", key });
  }, []);

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const getToggle = useCallback(
    (week: number, matchup_id: number) => {
      return state.toggles[makeKey(week, matchup_id)] ?? null;
    },
    [state.toggles]
  );

  const getMedianToggle = useCallback(
    (week: number, rosterId: number) => {
      return state.medianToggles[makeMedianKey(week, rosterId)] ?? null;
    },
    [state.medianToggles]
  );

  const hasToggles =
    Object.values(state.toggles).some((v) => v !== null) ||
    Object.values(state.medianToggles).some((v) => v !== null);

  return (
    <ScenarioCtx.Provider value={{ state, toggle, toggleMedian, reset, getToggle, getMedianToggle, hasToggles }}>
      {children}
    </ScenarioCtx.Provider>
  );
}

export function useScenario() {
  const ctx = useContext(ScenarioCtx);
  if (!ctx) throw new Error("useScenario must be used within ScenarioProvider");
  return ctx;
}
