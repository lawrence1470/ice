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
      sightings: {
        Row: {
          id: string;
          location: string;
          description: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          location: string;
          description?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          location?: string;
          description?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          subscription: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      insert_sighting: {
        Args: { lng: number; lat: number; description?: string | null };
        Returns: {
          id: string;
          location: string;
          description: string | null;
          created_at: string;
          expires_at: string;
        };
      };
      sightings_within_radius: {
        Args: { lat: number; lng: number; radius_meters: number };
        Returns: {
          id: string;
          location: string;
          description: string | null;
          created_at: string;
          expires_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
