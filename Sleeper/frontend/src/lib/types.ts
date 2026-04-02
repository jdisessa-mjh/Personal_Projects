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
  division: number | null;
  playoff_odds: number;
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
  num_bye_teams: number;
  current_week: number;
  league_average_match: boolean;
  season_complete: boolean;
  divisions: Record<string, number> | null;
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

export interface LockedMedian {
  week: number;
  roster_id: number;
  above_median: boolean;
}

export interface ScenarioResponse {
  standings: TeamStanding[];
}

export interface DraftPick {
  round: number;
  pick: number;
  overall: number;
  original_roster_id: number;
  owner_roster_id: number;
  owner_name: string;
  original_name: string;
}

export interface DraftOrderResponse {
  season: string;
  picks: DraftPick[];
}

export interface SavedLeague {
  leagueId: string;
  name: string;
  season: string;
  totalTeams: number;
  lastViewed: number;
}
