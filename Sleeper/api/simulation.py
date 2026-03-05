"""Monte Carlo playoff probability simulation using vectorized NumPy."""

from __future__ import annotations

import numpy as np

from .models import Matchup, TeamStanding, LockedMatchup
from .standings import sort_standings


def run_simulation(
    standings: list[TeamStanding],
    remaining_matchups: list[Matchup],
    locked_matchups: list[LockedMatchup],
    num_playoff_teams: int,
    num_bye_teams: int = 0,
    num_simulations: int = 10_000,
    league_average_match: bool = False,
) -> list[TeamStanding]:
    """Run Monte Carlo simulation and populate playoff odds on standings."""
    if not remaining_matchups:
        # All matchups completed — deterministic result
        sorted_teams = sort_standings(standings)
        for i, team in enumerate(sorted_teams):
            team.playoff_odds = 100.0 if i < num_playoff_teams else 0.0
            team.first_seed_odds = 100.0 if i == 0 else 0.0
            team.bye_odds = 100.0 if i < num_bye_teams else 0.0
        return sorted_teams

    # Build lookup: roster_id -> index
    roster_ids = [t.roster_id for t in standings]
    rid_to_idx = {rid: i for i, rid in enumerate(roster_ids)}
    n_teams = len(standings)

    # Base wins and points from current standings
    base_wins = np.array([t.wins for t in standings], dtype=np.float64)
    base_ties = np.array([t.ties for t in standings], dtype=np.float64)
    base_pf = np.array([t.points_for for t in standings], dtype=np.float64)
    base_pa = np.array([t.points_against for t in standings], dtype=np.float64)

    # Build locked matchup lookup: (week, matchup_id) -> winner_roster_id
    locked_map = {(lm.week, lm.matchup_id): lm.winner_roster_id for lm in locked_matchups}

    # Separate matchups into locked and unlocked
    locked_results: list[tuple[int, int]] = []  # (winner_idx, loser_idx)
    unlocked: list[tuple[int, int]] = []  # (idx1, idx2)

    for m in remaining_matchups:
        idx1 = rid_to_idx.get(m.roster_id_1)
        idx2 = rid_to_idx.get(m.roster_id_2)
        if idx1 is None or idx2 is None:
            continue

        key = (m.week, m.matchup_id)
        if key in locked_map:
            winner_rid = locked_map[key]
            if winner_rid == m.roster_id_1:
                locked_results.append((idx1, idx2))
            else:
                locked_results.append((idx2, idx1))
        else:
            unlocked.append((idx1, idx2))

    # Apply locked results to base wins
    # For league median: locked winners also beat the median
    for winner_idx, loser_idx in locked_results:
        base_wins[winner_idx] += 1
        if league_average_match:
            base_wins[winner_idx] += 1  # locked winner beats median

    # Count remaining weeks for median game coin flips
    remaining_weeks = sorted(set(m.week for m in remaining_matchups))
    # Identify which weeks have ALL matchups locked (no median flips needed)
    locked_weeks = set()
    if league_average_match:
        unlocked_weeks = set()
        for m in remaining_matchups:
            key = (m.week, m.matchup_id)
            if key not in locked_map:
                unlocked_weeks.add(m.week)
        locked_weeks = set(remaining_weeks) - unlocked_weeks

    n_unlocked = len(unlocked)

    if n_unlocked == 0 and not (league_average_match and remaining_weeks):
        # All matchups are locked and no median flips needed — deterministic
        sorted_teams = _build_final_standings(standings, base_wins, base_pf, base_pa)
        for i, team in enumerate(sorted_teams):
            team.playoff_odds = 100.0 if i < num_playoff_teams else 0.0
            team.first_seed_odds = 100.0 if i == 0 else 0.0
            team.bye_odds = 100.0 if i < num_bye_teams else 0.0
        return sorted_teams

    # Vectorized simulation: (num_simulations, n_unlocked) random coin flips
    rng = np.random.default_rng()
    flips = rng.random((num_simulations, max(n_unlocked, 1))) < 0.5  # True = team1 wins

    # Median game flips for unlocked weeks: each team gets independent 50/50 per week
    median_flips = None
    n_median_weeks = 0
    if league_average_match:
        median_week_list = sorted(unlocked_weeks) if unlocked_weeks else []
        n_median_weeks = len(median_week_list)
        if n_median_weeks > 0:
            # Shape: (num_simulations, n_median_weeks, n_teams)
            median_flips = rng.random((num_simulations, n_median_weeks, n_teams)) < 0.5

    # Convert unlocked matchups to arrays for vectorized indexing
    team1_indices = np.array([u[0] for u in unlocked]) if unlocked else np.array([], dtype=np.int64)
    team2_indices = np.array([u[1] for u in unlocked]) if unlocked else np.array([], dtype=np.int64)

    # Count playoff appearances, first seeds, byes
    playoff_counts = np.zeros(n_teams, dtype=np.int64)
    first_seed_counts = np.zeros(n_teams, dtype=np.int64)
    bye_counts = np.zeros(n_teams, dtype=np.int64)

    for sim in range(num_simulations):
        sim_wins = base_wins.copy()

        # Apply coin flip results for H2H matchups
        if n_unlocked > 0:
            winners = np.where(flips[sim], team1_indices, team2_indices)
            win_adds = np.bincount(winners, minlength=n_teams)
            sim_wins += win_adds

        # Apply median game coin flips
        if median_flips is not None:
            # Sum across weeks: each True = +1 win
            median_wins = median_flips[sim].sum(axis=0)  # shape: (n_teams,)
            sim_wins += median_wins

        # Sort by (wins DESC, points_for DESC, points_against DESC)
        # Create composite sort key
        sort_key = sim_wins * 1e12 + base_pf * 1e6 + base_pa
        ranked_indices = np.argsort(-sort_key)

        # Count playoff spots
        for rank, idx in enumerate(ranked_indices):
            if rank < num_playoff_teams:
                playoff_counts[idx] += 1
            if rank == 0:
                first_seed_counts[idx] += 1
            if rank < num_bye_teams:
                bye_counts[idx] += 1

    # Convert counts to percentages and assign back to standings
    for i, team in enumerate(standings):
        team.playoff_odds = round(playoff_counts[i] / num_simulations * 100, 1)
        team.first_seed_odds = round(first_seed_counts[i] / num_simulations * 100, 1)
        team.bye_odds = round(bye_counts[i] / num_simulations * 100, 1)

    return sort_standings(standings)


def _build_final_standings(
    standings: list[TeamStanding],
    wins: np.ndarray,
    pf: np.ndarray,
    pa: np.ndarray,
) -> list[TeamStanding]:
    """Build standings list with updated win counts."""
    for i, team in enumerate(standings):
        team.wins = int(wins[i])
        team.points_for = float(pf[i])
        team.points_against = float(pa[i])
    return sort_standings(standings)
