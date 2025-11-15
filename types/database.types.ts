// TypeScript types for Supabase database
// Generate fresh types with: npm run supabase:generate-types

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
          email: string | null
          full_name: string | null
          avatar_url: string | null
          preferences: Json
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Json
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Json
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          status: 'active' | 'paused' | 'archived'
          configuration: Json
          capabilities: string[]
          last_active: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          status?: 'active' | 'paused' | 'archived'
          configuration?: Json
          capabilities: string[]
          last_active?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          status?: 'active' | 'paused' | 'archived'
          configuration?: Json
          capabilities?: string[]
          last_active?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          workflow_id: string | null
          title: string
          description: string | null
          status: 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
          priority: number
          due_date: string | null
          assigned_to: string | null
          agent_id: string | null
          metadata: Json
          parent_task_id: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workflow_id?: string | null
          title: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
          priority?: number
          due_date?: string | null
          assigned_to?: string | null
          agent_id?: string | null
          metadata?: Json
          parent_task_id?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workflow_id?: string | null
          title?: string
          description?: string | null
          status?: 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
          priority?: number
          due_date?: string | null
          assigned_to?: string | null
          agent_id?: string | null
          metadata?: Json
          parent_task_id?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      workflows: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          trigger_type: 'manual' | 'scheduled' | 'event' | 'ai_suggested' | null
          trigger_config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          trigger_type?: 'manual' | 'scheduled' | 'event' | 'ai_suggested' | null
          trigger_config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          trigger_type?: 'manual' | 'scheduled' | 'event' | 'ai_suggested' | null
          trigger_config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          agent_id: string | null
          title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_id?: string | null
          title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string | null
          title?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json
          embeddings: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          embeddings?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json
          embeddings?: number[] | null
          created_at?: string
        }
      }
      knowledge_items: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          content: string | null
          embeddings: number[] | null
          metadata: Json
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          content?: string | null
          embeddings?: number[] | null
          metadata?: Json
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          content?: string | null
          embeddings?: number[] | null
          metadata?: Json
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
