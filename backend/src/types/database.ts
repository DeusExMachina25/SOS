export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          full_name: string | null
          role: 'client' | 'expert' | 'admin'
          created_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          email?: string | null
          full_name?: string | null
          role?: 'client' | 'expert' | 'admin'
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string | null
          email?: string | null
          full_name?: string | null
          role?: 'client' | 'expert' | 'admin'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedSchema: "auth"
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          client_id: string | null
          expert_id: string | null
          status: string
          scheduled_at: string | null
          duration_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          expert_id?: string | null
          status?: string
          scheduled_at?: string | null
          duration_minutes?: number
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          expert_id?: string | null
          status?: string
          scheduled_at?: string | null
          duration_minutes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedSchema: "public"
          },
          {
            foreignKeyName: "sessions_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedSchema: "public"
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'client' | 'expert' | 'admin'
    }
  }
}
