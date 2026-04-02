"""FastAPI app entrypoint for Sleeper Playoff Predictor."""

from __future__ import annotations

import asyncio

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import sleeper_client as sc
from .models import (
    DraftOrderResponse,
    DraftPick,
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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://*.vercel.app"],
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

    # Detect offseason: different season, or NFL state says "off"/"pre" with week 0
    nfl_season = str(nfl_state.get("season", ""))
    season_type = nfl_state.get("season_type", "")
    if str(league_season) != nfl_season:
        current_week = playoff_week_start
    elif season_type == "off" or (season_type == "pre" and current_week == 0):
        current_week = 0

    league_average_match = bool(settings.get("league_average_match", 0))

    # Build division mapping: roster_id -> division number
    num_divisions = settings.get("divisions", 0)
    divisions: dict[int, int] | None = None
    if num_divisions and num_divisions > 0:
        divisions = {}
        for roster in rosters_raw:
            rid = roster["roster_id"]
            div = (roster.get("settings") or {}).get("division", 1)
            divisions[rid] = div

    effective_week = min(current_week, playoff_week_start)
    # Season is complete if we're past regular season, or it's the offseason
    season_complete = (
        effective_week >= playoff_week_start
        or season_type == "off"
        or (str(league_season) != nfl_season)
    )

    # Calculate bye teams
    num_bye = 2 if num_playoff_teams == 6 else 0

    league_info = LeagueInfo(
        league_id=league_id,
        name=league_raw.get("name", "Unknown League"),
        season=season,
        total_teams=total_teams,
        playoff_week_start=playoff_week_start,
        num_playoff_teams=num_playoff_teams,
        num_bye_teams=num_bye,
        current_week=effective_week,
        league_average_match=league_average_match,
        season_complete=season_complete,
        divisions=divisions,
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

    standings = build_standings(rosters_raw, users_raw, all_matchups, league_info.divisions)
    remaining = get_remaining_matchups(all_matchups, league_info.current_week)

    standings = run_simulation(
        standings=standings,
        remaining_matchups=remaining,
        locked_matchups=[],
        num_playoff_teams=league_info.num_playoff_teams,
        num_bye_teams=league_info.num_bye_teams,
        league_average_match=league_info.league_average_match,
        divisions=league_info.divisions,
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

    standings = build_standings(rosters_raw, users_raw, all_matchups, league_info.divisions)
    remaining = get_remaining_matchups(all_matchups, league_info.current_week)
    valid_locked = validate_locked_matchups(request.locked_matchups, remaining)

    standings = run_simulation(
        standings=standings,
        remaining_matchups=remaining,
        locked_matchups=valid_locked,
        num_playoff_teams=league_info.num_playoff_teams,
        num_bye_teams=league_info.num_bye_teams,
        league_average_match=league_info.league_average_match,
        divisions=league_info.divisions,
        locked_medians=request.locked_medians,
    )

    return ScenarioResponse(standings=standings)


@app.get("/api/league/{league_id}/matchups", response_model=list[Matchup])
async def get_matchups(league_id: str):
    """Get all regular season matchups."""
    league_info, *_ = await _fetch_league_data(league_id)
    return await _fetch_all_matchups(
        league_id, league_info.playoff_week_start, league_info.current_week
    )


@app.get("/api/league/{league_id}/draft-order", response_model=DraftOrderResponse)
async def get_draft_order(league_id: str):
    """Get projected rookie draft order based on standings and traded picks."""
    league_info, league_raw, rosters_raw, users_raw, nfl_state = await _fetch_league_data(league_id)

    all_matchups = await _fetch_all_matchups(
        league_id, league_info.playoff_week_start, league_info.current_week
    )
    standings = build_standings(rosters_raw, users_raw, all_matchups, league_info.divisions)
    remaining = get_remaining_matchups(all_matchups, league_info.current_week)
    standings = run_simulation(
        standings=standings,
        remaining_matchups=remaining,
        locked_matchups=[],
        num_playoff_teams=league_info.num_playoff_teams,
        num_bye_teams=league_info.num_bye_teams,
        league_average_match=league_info.league_average_match,
        divisions=league_info.divisions,
    )

    traded_picks_raw = await sc.get_traded_picks(league_id)

    # Build name lookup
    name_map: dict[int, str] = {}
    for t in standings:
        name_map[t.roster_id] = t.display_name

    # Draft order: non-playoff teams reversed, then playoff teams reversed
    num_playoff = league_info.num_playoff_teams
    non_playoff = list(reversed(standings[num_playoff:]))
    playoff = list(reversed(standings[:num_playoff]))
    base_order = non_playoff + playoff

    # Determine the draft season (next season after current)
    draft_season = str(int(league_info.season) + 1)

    # Build traded picks lookup: (season, round, original_roster_id) -> new_owner_roster_id
    traded_map: dict[tuple[str, int, int], int] = {}
    for tp in traded_picks_raw:
        key = (str(tp.get("season", "")), tp.get("round", 0), tp.get("roster_id", 0))
        traded_map[key] = tp.get("owner_id", tp.get("roster_id", 0))

    # Determine number of rounds (Sleeper default is typically 3-5 for rookie drafts)
    settings = league_raw.get("settings", {})
    num_rounds = settings.get("draft_rounds", 3)

    picks: list[DraftPick] = []
    overall = 1
    for rd in range(1, num_rounds + 1):
        for pick_in_round, team in enumerate(base_order, 1):
            original_rid = team.roster_id
            # Check if this pick was traded
            trade_key = (draft_season, rd, original_rid)
            owner_rid = traded_map.get(trade_key, original_rid)

            picks.append(DraftPick(
                round=rd,
                pick=pick_in_round,
                overall=overall,
                original_roster_id=original_rid,
                owner_roster_id=owner_rid,
                owner_name=name_map.get(owner_rid, "Unknown"),
                original_name=name_map.get(original_rid, "Unknown"),
            ))
            overall += 1

    return DraftOrderResponse(season=draft_season, picks=picks)
