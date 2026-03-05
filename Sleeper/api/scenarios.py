"""Scenario-mode logic: filter matchups based on locked outcomes."""

from __future__ import annotations

from .models import Matchup, LockedMatchup


def get_remaining_matchups(
    all_matchups: list[Matchup],
    current_week: int,
) -> list[Matchup]:
    """Return matchups that are not yet completed (future + current incomplete)."""
    return [m for m in all_matchups if not m.completed]


def validate_locked_matchups(
    locked: list[LockedMatchup],
    remaining: list[Matchup],
) -> list[LockedMatchup]:
    """Validate that locked matchups reference real remaining matchups."""
    remaining_keys = {(m.week, m.matchup_id) for m in remaining}
    valid = []
    for lm in locked:
        if (lm.week, lm.matchup_id) in remaining_keys:
            valid.append(lm)
    return valid
