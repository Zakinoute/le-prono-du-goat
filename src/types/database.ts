/**
 * Types de la base de données Supabase — "Le Prono du GOAT".
 *
 * Maintenu à la main pour coller aux migrations SQL (supabase/migrations/).
 * Régénérable plus tard via :
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type MemberRole = "owner" | "admin" | "member";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          ai_profile: string | null;
          ai_profile_data: Json | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          ai_profile?: string | null;
          ai_profile_data?: Json | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          invite_code: string;
          owner_id: string;
          is_public: boolean;
          max_members: number | null;
          prize_pool_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          invite_code?: string;
          owner_id: string;
          is_public?: boolean;
          max_members?: number | null;
          prize_pool_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leagues"]["Insert"]>;
        Relationships: [];
      };
      league_members: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          role: MemberRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id: string;
          role?: MemberRole;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["league_members"]["Insert"]>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          api_football_id: number | null;
          season: number | null;
          stage: string | null;
          group_name: string | null;
          round: string | null;
          home_team: string;
          away_team: string;
          home_team_code: string | null;
          away_team_code: string | null;
          home_team_logo: string | null;
          away_team_logo: string | null;
          home_score: number | null;
          away_score: number | null;
          status: MatchStatus;
          kickoff_at: string;
          venue: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          api_football_id?: number | null;
          season?: number | null;
          stage?: string | null;
          group_name?: string | null;
          round?: string | null;
          home_team: string;
          away_team: string;
          home_team_code?: string | null;
          away_team_code?: string | null;
          home_team_logo?: string | null;
          away_team_logo?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          status?: MatchStatus;
          kickoff_at: string;
          venue?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          home_score: number;
          away_score: number;
          points: number;
          is_exact: boolean;
          is_correct_result: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          home_score: number;
          away_score: number;
          points?: number;
          is_exact?: boolean;
          is_correct_result?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["predictions"]["Insert"]>;
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["badges"]["Insert"]>;
        Relationships: [];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_badges"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          icon: string | null;
          link: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          icon?: string | null;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      standings_snapshots: {
        Row: {
          id: string;
          league_id: string;
          user_id: string;
          captured_on: string;
          rank: number;
          total_points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id: string;
          captured_on: string;
          rank: number;
          total_points: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["standings_snapshots"]["Insert"]
        >;
        Relationships: [];
      };
      match_reactions: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["match_reactions"]["Insert"]
        >;
        Relationships: [];
      };
      match_summaries: {
        Row: {
          match_id: string;
          provider: string;
          kind: string;
          content: string;
          model: string | null;
          generated_at: string;
        };
        Insert: {
          match_id: string;
          provider: string;
          kind: string;
          content: string;
          model?: string | null;
          generated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["match_summaries"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      league_standings: {
        Row: {
          league_id: string;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          total_points: number;
          played: number;
          exact_count: number;
          correct_result_count: number;
          rank: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      join_league_by_code: {
        Args: { p_code: string };
        Returns: string;
      };
      is_member_of: {
        Args: { p_league_id: string };
        Returns: boolean;
      };
      shares_league_with: {
        Args: { p_other: string };
        Returns: boolean;
      };
    };
    Enums: {
      match_status: MatchStatus;
      member_role: MemberRole;
    };
  };
}

// Raccourcis pratiques
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type League = Database["public"]["Tables"]["leagues"]["Row"];
export type LeagueMember = Database["public"]["Tables"]["league_members"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Prediction = Database["public"]["Tables"]["predictions"]["Row"];
export type Badge = Database["public"]["Tables"]["badges"]["Row"];
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type StandingsSnapshot =
  Database["public"]["Tables"]["standings_snapshots"]["Row"];
export type MatchReaction =
  Database["public"]["Tables"]["match_reactions"]["Row"];
export type MatchSummary =
  Database["public"]["Tables"]["match_summaries"]["Row"];
export type LeagueStanding =
  Database["public"]["Views"]["league_standings"]["Row"];
