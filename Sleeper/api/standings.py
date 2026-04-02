"""Calculate standings from roster and matchup data."""

from __future__ import annotations

from .models import TeamStanding, Matchup


def build_standings(
    rosters: list[dict],
    users: list[dict],
    completed_matchups: list[Matchup],
    divisions: dict[int, int] | None = None,
) -> list[TeamStanding]:
    """Build standings from roster data and completed matchups."""
    user_map = {u["user_id"]: u for u in users}

    standings: dict[int, TeamStanding] = {}
    for roster in rosters:
        rid = roster["roster_id"]
        owner_id = roster.get("owner_id")
        user = user_map.get(owner_id, {}) if owner_id else {}
        settings = roster.get("settings") or {}

        standings[rid] = TeamStanding(
            roster_id=rid,
            owner_id=owner_id,
            display_name=(user.get("metadata") or {}).get("team_name")
            or user.get("display_name")
            or user.get("username")
            or "Unknown",
            avatar=user.get("avatar"),
            wins=settings.get("wins", 0),
            losses=settings.get("losses", 0),
            ties=settings.get("ties", 0),
            points_for=settings.get("fpts", 0) + settings.get("fpts_decimal", 0) / 100,
            points_against=settings.get("fpts_against", 0)
            + settings.get("fpts_against_decimal", 0) / 100,
            division=divisions.get(rid) if divisions else None,
        )

    return sort_standings(list(standings.values()))


def sort_standings(standings: list[TeamStanding]) -> list[TeamStanding]:
    """Sort standings: wins DESC, points_for DESC, points_against DESC."""
    return sorted(
        standings,
        key=lambda t: (t.wins, t.points_for, t.points_against),
        reverse=True,
    )
