"""Monte Carlo playoff probability simulation using vectorized NumPy."""

from __future__ import annotations

import numpy as np

from .models import Matchup, TeamStanding, LockedMatchup, LockedMedian
from .standings import sort_standings


def run_simulation(
    standings: list[TeamStanding],
    remaining_matchups: list[Matchup],
    locked_matchups: list[LockedMatchup],
    num_playoff_teams: int,
    num_bye_teams: int = 0,
    num_simulations: int = 10_000,
    league_average_match: bool = False,
    divisions: dict[int, int] | None = None,
    locked_medians: list[LockedMedian] | None = None,
) -> list[TeamStanding]:
    """Run Monte Carlo simulation and populate playoff odds on standings."""
    if not remaining_matchups:
        # All matchups completed — deterministic result
        sorted_teams = sort_standings(standings)
        _apply_division_guarantees_deterministic(
            sorted_teams, num_playoff_teams, divisions
        )
        for i, team in enumerate(sorted_teams):
            team.playoff_odds = 100.0 if i < num_playoff_teams else 0.0
            team.bye_odds = 100.0 if i < num_bye_teams else 0.0
        return sorted_teams

    # Build lookup: roster_id -> index
    roster_ids = [t.roster_id for t in standings]
    rid_to_idx = {rid: i for i, rid in enumerate(roster_ids)}
    n_teams = len(standings)

    # Base wins and points from current standings
    base_wins = np.array([t.wins for t in standings], dtype=np.float64)
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

    # Apply locked results to base wins (H2H only — median is simulated separately)
    for winner_idx, loser_idx in locked_results:
        base_wins[winner_idx] += 1

    # Build locked median lookup: (week, team_idx) -> above_median bool
    locked_median_map: dict[tuple[int, int], bool] = {}
    if locked_medians:
        for lm in locked_medians:
            idx = rid_to_idx.get(lm.roster_id)
            if idx is not None:
                locked_median_map[(lm.week, idx)] = lm.above_median
                if lm.above_median:
                    base_wins[idx] += 1

    # Count remaining weeks for median game simulation
    remaining_weeks = sorted(set(m.week for m in remaining_matchups))
    # All remaining weeks need median simulation regardless of H2H locks
    unlocked_weeks = set(remaining_weeks) if league_average_match else set()

    n_unlocked = len(unlocked)

    # Check if all median outcomes are also locked
    all_medians_locked = True
    if league_average_match and remaining_weeks:
        for week in remaining_weeks:
            for ti in range(n_teams):
                if (week, ti) not in locked_median_map:
                    all_medians_locked = False
                    break
            if not all_medians_locked:
                break
    else:
        all_medians_locked = True

    if n_unlocked == 0 and all_medians_locked:
        # All matchups are locked and no median flips needed — deterministic
        sorted_teams = _build_final_standings(standings, base_wins, base_pf, base_pa)
        _apply_division_guarantees_deterministic(
            sorted_teams, num_playoff_teams, divisions
        )
        for i, team in enumerate(sorted_teams):
            team.playoff_odds = 100.0 if i < num_playoff_teams else 0.0
            team.bye_odds = 100.0 if i < num_bye_teams else 0.0
        return sorted_teams

    rng = np.random.default_rng()

    # --- H2H matchup probabilities (weighted 35-65% by points_for) ---
    team1_indices = np.array([u[0] for u in unlocked]) if unlocked else np.array([], dtype=np.int64)
    team2_indices = np.array([u[1] for u in unlocked]) if unlocked else np.array([], dtype=np.int64)

    if n_unlocked > 0:
        pf1 = base_pf[team1_indices]
        pf2 = base_pf[team2_indices]
        total = pf1 + pf2
        # Where both teams have 0 points, use 50/50
        safe_total = np.where(total > 0, total, 1.0)
        raw_ratio = pf1 / safe_total  # 0-1 range, 0.5 when equal
        # Scale into 0.35 - 0.65 range: team1 win probability
        h2h_probs = 0.35 + 0.30 * raw_ratio  # shape: (n_unlocked,)
        flips = rng.random((num_simulations, n_unlocked)) < h2h_probs[np.newaxis, :]
    else:
        flips = None

    # --- Median game probabilities (weighted 35-65% by points_for) ---
    median_flips = None
    median_mask = None  # True = simulate, False = locked (already in base_wins)
    n_median_weeks = 0
    if league_average_match:
        median_week_list = sorted(unlocked_weeks) if unlocked_weeks else []
        n_median_weeks = len(median_week_list)
        if n_median_weeks > 0:
            pf_min = base_pf.min()
            pf_max = base_pf.max()
            if pf_max > pf_min:
                median_probs = 0.35 + 0.30 * (base_pf - pf_min) / (pf_max - pf_min)
            else:
                median_probs = np.full(n_teams, 0.5)
            raw = rng.random((num_simulations, n_median_weeks, n_teams))
            median_flips = raw < median_probs[np.newaxis, np.newaxis, :]

            # Build mask to exclude locked median outcomes from simulation
            if locked_median_map:
                median_mask = np.ones((n_median_weeks, n_teams), dtype=bool)
                for wi, week in enumerate(median_week_list):
                    for ti in range(n_teams):
                        if (week, ti) in locked_median_map:
                            median_mask[wi, ti] = False

    # --- Division setup for playoff guarantees ---
    div_masks = None
    unique_divs = None
    if divisions:
        unique_divs = sorted(set(divisions.values()))
        # Boolean mask: (n_divisions, n_teams)
        div_masks = np.zeros((len(unique_divs), n_teams), dtype=bool)
        div_id_to_row = {d: i for i, d in enumerate(unique_divs)}
        for rid, div_id in divisions.items():
            idx = rid_to_idx.get(rid)
            if idx is not None:
                div_masks[div_id_to_row[div_id], idx] = True

    # Count playoff appearances and byes
    playoff_counts = np.zeros(n_teams, dtype=np.int64)
    bye_counts = np.zeros(n_teams, dtype=np.int64)

    for sim in range(num_simulations):
        sim_wins = base_wins.copy()

        # Apply coin flip results for H2H matchups
        if flips is not None and n_unlocked > 0:
            winners = np.where(flips[sim], team1_indices, team2_indices)
            win_adds = np.bincount(winners, minlength=n_teams)
            sim_wins += win_adds

        # Apply median game coin flips (excluding locked ones already in base_wins)
        if median_flips is not None:
            sim_median = median_flips[sim]
            if median_mask is not None:
                sim_median = sim_median & median_mask
            median_wins = sim_median.sum(axis=0)
            sim_wins += median_wins

        # Sort by (wins DESC, points_for DESC, points_against DESC)
        sort_key = sim_wins * 1e12 + base_pf * 1e6 + base_pa
        ranked_indices = np.argsort(-sort_key)

        # Apply division winner guarantees
        if div_masks is not None:
            ranked_indices = _apply_division_guarantees(
                ranked_indices, sort_key, div_masks, num_playoff_teams
            )

        # Count playoff spots
        for rank, idx in enumerate(ranked_indices):
            if rank < num_playoff_teams:
                playoff_counts[idx] += 1
            if rank < num_bye_teams:
                bye_counts[idx] += 1

    # Convert counts to percentages and assign back to standings
    for i, team in enumerate(standings):
        team.playoff_odds = round(playoff_counts[i] / num_simulations * 100, 1)
        team.bye_odds = round(bye_counts[i] / num_simulations * 100, 1)

    return sort_standings(standings)


def _apply_division_guarantees(
    ranked_indices: np.ndarray,
    sort_key: np.ndarray,
    div_masks: np.ndarray,
    num_playoff_teams: int,
) -> np.ndarray:
    """Ensure each division's top team is in the playoff spots.

    For each division, find the team with the highest sort_key. If that team
    is outside the playoff cutoff, swap it with the lowest-ranked playoff team
    that isn't itself a division winner.
    """
    ranked = ranked_indices.copy()
    n_playoff = num_playoff_teams
    n_divs = div_masks.shape[0]

    # Find division winners: best sort_key in each division
    div_winners = set()
    for d in range(n_divs):
        div_team_indices = np.where(div_masks[d])[0]
        if len(div_team_indices) == 0:
            continue
        best_in_div = div_team_indices[np.argmax(sort_key[div_team_indices])]
        div_winners.add(best_in_div)

    # Check if any division winner is outside playoff spots
    for dw in div_winners:
        rank_of_dw = np.where(ranked == dw)[0][0]
        if rank_of_dw >= n_playoff:
            # Find lowest-ranked playoff team that is NOT a division winner
            for swap_rank in range(n_playoff - 1, -1, -1):
                if ranked[swap_rank] not in div_winners:
                    ranked[rank_of_dw] = ranked[swap_rank]
                    ranked[swap_rank] = dw
                    break

    return ranked


def _apply_division_guarantees_deterministic(
    sorted_teams: list[TeamStanding],
    num_playoff_teams: int,
    divisions: dict[int, int] | None,
) -> None:
    """Reorder a deterministic standings list to guarantee division winners."""
    if not divisions:
        return

    # Find division winners (best rank per division)
    div_best: dict[int, int] = {}  # division -> index in sorted_teams
    for i, team in enumerate(sorted_teams):
        div = divisions.get(team.roster_id)
        if div is not None and div not in div_best:
            div_best[div] = i

    # Move division winners into playoff spots if needed
    for div, winner_idx in div_best.items():
        if winner_idx < num_playoff_teams:
            continue
        # Find lowest-ranked playoff team that isn't a division winner
        div_winner_positions = set(div_best.values())
        for swap_idx in range(num_playoff_teams - 1, -1, -1):
            if swap_idx not in div_winner_positions:
                sorted_teams[winner_idx], sorted_teams[swap_idx] = (
                    sorted_teams[swap_idx],
                    sorted_teams[winner_idx],
                )
                div_best[div] = swap_idx
                break


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
