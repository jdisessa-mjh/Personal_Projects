export interface TeamStanding {
  roster_id: number;
  owner_id: string | null;
  display_name: string;
  avatar: string | null;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  playoff_odds: number;
  first_seed_odds: number;
  bye_odds: number;
}

export interface Matchup {
  week: number;
  matchup_id: number;
  roster_id_1: number;
  roster_id_2: number;
  points_1: number | null;
  points_2: number | null;
  completed: boolean;
}

export interface LeagueInfo {
  league_id: string;
  name: string;
  season: string;
  total_teams: number;
  playoff_week_start: number;
  num_playoff_teams: number;
  current_week: number;
  league_average_match: boolean;
}

export interface LeagueResponse {
  league: LeagueInfo;
  standings: TeamStanding[];
  matchups: Matchup[];
}

export interface LockedMatchup {
  week: number;
  matchup_id: number;
  winner_roster_id: number;
}

export interface ScenarioResponse {
  standings: TeamStanding[];
}

export type ToggleState = "unset" | number; // "unset" or winner's roster_id
