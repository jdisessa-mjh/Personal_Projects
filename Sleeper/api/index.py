"""FastAPI app entrypoint for Sleeper Playoff Predictor."""

from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import sleeper_client as sc
from .models import (
    LeagueInfo,
    LeagueResponse,
    Matchup,
    ScenarioRequest,
    ScenarioResponse,
    TeamStanding,
)
from .standings import build_standings
from .simulation import run_simulation
from .scenarios import get_remaining_matchups, validate_locked_matchups

app = FastAPI(title="Sleeper Playoff Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _fetch_league_data(league_id: str):
    """Fetch all league data from Sleeper in parallel."""
    try:
        league_raw, rosters_raw, users_raw, nfl_state = await asyncio.gather(
            sc.get_league(league_id),
            sc.get_rosters(league_id),
            sc.get_users(league_id),
            sc.get_nfl_state(),
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"League not found or Sleeper API error: {e}")

    settings = league_raw.get("settings", {})
    playoff_week_start = settings.get("playoff_week_start", 15)
    num_playoff_teams = settings.get("playoff_teams", 6)
    total_teams = settings.get("num_teams", league_raw.get("total_rosters", 12))
    season = league_raw.get("season", nfl_state.get("season", "2024"))
    current_week = nfl_state.get("week", 1)
    league_season = league_raw.get("season")

    # Only use NFL state week if this league is for the current NFL season
    nfl_season = str(nfl_state.get("season", ""))
    if str(league_season) != nfl_season:
        # Off-season or different season: treat all weeks as completed
        current_week = playoff_week_start

    league_average_match = bool(settings.get("league_average_match", 0))

    league_info = LeagueInfo(
        league_id=league_id,
        name=league_raw.get("name", "Unknown League"),
        season=season,
        total_teams=total_teams,
        playoff_week_start=playoff_week_start,
        num_playoff_teams=num_playoff_teams,
        current_week=min(current_week, playoff_week_start),
        league_average_match=league_average_match,
    )

    return league_info, league_raw, rosters_raw, users_raw, nfl_state


async def _fetch_all_matchups(
    league_id: str, playoff_week_start: int, current_week: int
) -> list[Matchup]:
    """Fetch matchups for all regular season weeks."""
    last_regular_week = playoff_week_start - 1
    if last_regular_week < 1:
        return []

    weeks = range(1, last_regular_week + 1)
    raw_weeks = await asyncio.gather(
        *[sc.get_matchups(league_id, w) for w in weeks]
    )

    matchups: list[Matchup] = []
    for week_num, week_data in zip(weeks, raw_weeks):
        if not week_data:
            continue
        # Group by matchup_id
        by_mid: dict[int, list[dict]] = {}
        for entry in week_data:
            mid = entry.get("matchup_id")
            if mid is not None:
                by_mid.setdefault(mid, []).append(entry)

        for mid, entries in by_mid.items():
            if len(entries) < 2:
                continue
            e1, e2 = entries[0], entries[1]
            pts1 = e1.get("points")
            pts2 = e2.get("points")

            # A week is completed if it's before the current week
            completed = week_num < current_week

            matchups.append(
                Matchup(
                    week=week_num,
                    matchup_id=mid,
                    roster_id_1=e1["roster_id"],
                    roster_id_2=e2["roster_id"],
                    points_1=pts1 if completed else None,
                    points_2=pts2 if completed else None,
                    completed=completed,
                )
            )

    return matchups


@app.get("/api/league/{league_id}", response_model=LeagueResponse)
async def get_league(league_id: str):
    """Get league info, standings with playoff odds, and matchups."""
    league_info, league_raw, rosters_raw, users_raw, nfl_state = await _fetch_league_data(league_id)

    all_matchups = await _fetch_all_matchups(
        league_id, league_info.playoff_week_start, league_info.current_week
    )

    standings = build_standings(rosters_raw, users_raw, all_matchups)
    remaining = get_remaining_matchups(all_matchups, league_info.current_week)

    # Calculate bye teams: if 6+ playoff teams, top 2 get bye; if 8, top 0; if 4, top 0
    num_bye = 2 if league_info.num_playoff_teams == 6 else 0

    standings = run_simulation(
        standings=standings,
        remaining_matchups=remaining,
        locked_matchups=[],
        num_playoff_teams=league_info.num_playoff_teams,
        num_bye_teams=num_bye,
        league_average_match=league_info.league_average_match,
    )

    return LeagueResponse(
        league=league_info,
        standings=standings,
        matchups=all_matchups,
    )


@app.post("/api/league/{league_id}/scenario", response_model=ScenarioResponse)
async def run_scenario(league_id: str, request: ScenarioRequest):
    """Re-run simulation with user-locked matchup outcomes."""
    league_info, league_raw, rosters_raw, users_raw, nfl_state = await _fetch_league_data(league_id)

    all_matchups = await _fetch_all_matchups(
        league_id, league_info.playoff_week_start, league_info.current_week
    )

    standings = build_standings(rosters_raw, users_raw, all_matchups)
    remaining = get_remaining_matchups(all_matchups, league_info.current_week)
    valid_locked = validate_locked_matchups(request.locked_matchups, remaining)

    num_bye = 2 if league_info.num_playoff_teams == 6 else 0

    standings = run_simulation(
        standings=standings,
        remaining_matchups=remaining,
        locked_matchups=valid_locked,
        num_playoff_teams=league_info.num_playoff_teams,
        num_bye_teams=num_bye,
        league_average_match=league_info.league_average_match,
    )

    return ScenarioResponse(standings=standings)


@app.get("/api/league/{league_id}/matchups", response_model=list[Matchup])
async def get_matchups(league_id: str):
    """Get all regular season matchups."""
    league_info, *_ = await _fetch_league_data(league_id)
    return await _fetch_all_matchups(
        league_id, league_info.playoff_week_start, league_info.current_week
    )
