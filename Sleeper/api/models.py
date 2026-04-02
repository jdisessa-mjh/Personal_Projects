"""Pydantic models for API requests and responses."""

from __future__ import annotations

from pydantic import BaseModel


class TeamStanding(BaseModel):
    roster_id: int
    owner_id: str | None = None
    display_name: str = "Unknown"
    avatar: str | None = None
    wins: int = 0
    losses: int = 0
    ties: int = 0
    points_for: float = 0.0
    points_against: float = 0.0
    division: int | None = None
    # Simulation results
    playoff_odds: float = 0.0
    bye_odds: float = 0.0


class Matchup(BaseModel):
    week: int
    matchup_id: int
    roster_id_1: int
    roster_id_2: int
    points_1: float | None = None
    points_2: float | None = None
    completed: bool = False


class LeagueInfo(BaseModel):
    league_id: str
    name: str
    season: str
    total_teams: int
    playoff_week_start: int
    num_playoff_teams: int
    num_bye_teams: int = 0
    current_week: int
    league_average_match: bool = False
    season_complete: bool = False
    divisions: dict[int, int] | None = None  # roster_id -> division number


class LeagueResponse(BaseModel):
    league: LeagueInfo
    standings: list[TeamStanding]
    matchups: list[Matchup]


class LockedMatchup(BaseModel):
    week: int
    matchup_id: int
    winner_roster_id: int


class LockedMedian(BaseModel):
    week: int
    roster_id: int
    above_median: bool


class ScenarioRequest(BaseModel):
    locked_matchups: list[LockedMatchup] = []
    locked_medians: list[LockedMedian] = []


class ScenarioResponse(BaseModel):
    standings: list[TeamStanding]


class DraftPick(BaseModel):
    round: int
    pick: int  # pick within round
    overall: int  # overall pick number
    original_roster_id: int  # roster that generated the pick (by standing)
    owner_roster_id: int  # who currently owns the pick
    owner_name: str = "Unknown"
    original_name: str = "Unknown"


class DraftOrderResponse(BaseModel):
    season: str
    picks: list[DraftPick]
