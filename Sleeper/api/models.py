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
    # Simulation results
    playoff_odds: float = 0.0
    first_seed_odds: float = 0.0
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
    current_week: int
    league_average_match: bool = False
    divisions: dict[str, str] | None = None  # roster_id -> division name


class LeagueResponse(BaseModel):
    league: LeagueInfo
    standings: list[TeamStanding]
    matchups: list[Matchup]


class LockedMatchup(BaseModel):
    week: int
    matchup_id: int
    winner_roster_id: int


class ScenarioRequest(BaseModel):
    locked_matchups: list[LockedMatchup] = []


class ScenarioResponse(BaseModel):
    standings: list[TeamStanding]
