export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assessment_equipments: {
        Row: {
          assessment_id: string | null
          created_at: string | null
          equipment_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string | null
          equipment_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string | null
          equipment_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_equipments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_equipments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          description_i18n: Json | null
          id: string
          max_level: number
          measured_metric_id: string | null
          min_level: number
          name: string
          name_i18n: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_i18n?: Json | null
          id?: string
          max_level: number
          measured_metric_id?: string | null
          min_level: number
          name: string
          name_i18n?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_i18n?: Json | null
          id?: string
          max_level?: number
          measured_metric_id?: string | null
          min_level?: number
          name?: string
          name_i18n?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_measured_metric_id_fkey"
            columns: ["measured_metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      block_types: {
        Row: {
          created_at: string | null
          id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      category_metrics: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          metric_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          metric_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          metric_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_metrics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_metrics_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      environment_equipments: {
        Row: {
          created_at: string | null
          environment_id: string
          equipment_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          environment_id: string
          equipment_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          environment_id?: string
          equipment_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environment_equipments_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "environment_equipments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      environments: {
        Row: {
          created_at: string | null
          description_i18n: Json | null
          id: string
          name_i18n: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_i18n?: Json | null
          id?: string
          name_i18n?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_i18n?: Json | null
          id?: string
          name_i18n?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      equipments: {
        Row: {
          created_at: string | null
          id: string
          name_i18n: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_i18n?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name_i18n?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      exercise_blocks: {
        Row: {
          block_type_id: string | null
          created_at: string | null
          exercise_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          block_type_id?: string | null
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          block_type_id?: string | null
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_blocks_block_type_id_fkey"
            columns: ["block_type_id"]
            isOneToOne: false
            referencedRelation: "block_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_blocks_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_environments: {
        Row: {
          environment_id: string
          exercise_id: string
        }
        Insert: {
          environment_id: string
          exercise_id: string
        }
        Update: {
          environment_id?: string
          exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_environments_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_environments_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_equipments: {
        Row: {
          created_at: string | null
          equipment_id: string | null
          exercise_id: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_id?: string | null
          exercise_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_id?: string | null
          exercise_id?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_equipments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_equipments_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_region: Database["public"]["Enums"]["body_region"] | null
          category_id: string | null
          created_at: string | null
          description: string | null
          description_i18n: Json | null
          id: string
          max_level: number
          min_level: number
          movement_pattern:
            | Database["public"]["Enums"]["movement_pattern"]
            | null
          name: string
          slug: string
          thumbnail_storage_path: string | null
          updated_at: string | null
          video_storage_path: string | null
          youtube_url: string | null
        }
        Insert: {
          body_region?: Database["public"]["Enums"]["body_region"] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_i18n?: Json | null
          id?: string
          max_level: number
          min_level: number
          movement_pattern?:
            | Database["public"]["Enums"]["movement_pattern"]
            | null
          name: string
          slug: string
          thumbnail_storage_path?: string | null
          updated_at?: string | null
          video_storage_path?: string | null
          youtube_url?: string | null
        }
        Update: {
          body_region?: Database["public"]["Enums"]["body_region"] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          description_i18n?: Json | null
          id?: string
          max_level?: number
          min_level?: number
          movement_pattern?:
            | Database["public"]["Enums"]["movement_pattern"]
            | null
          name?: string
          slug?: string
          thumbnail_storage_path?: string | null
          updated_at?: string | null
          video_storage_path?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_entries: {
        Row: {
          created_at: string | null
          id: string
          metric_id: string | null
          score: number | null
          source_type: Database["public"]["Enums"]["metric_source_type"]
          updated_at: string | null
          user_assessment_id: string | null
          user_id: string | null
          value: number
          workout_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_id?: string | null
          score?: number | null
          source_type: Database["public"]["Enums"]["metric_source_type"]
          updated_at?: string | null
          user_assessment_id?: string | null
          user_id?: string | null
          value: number
          workout_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_id?: string | null
          score?: number | null
          source_type?: Database["public"]["Enums"]["metric_source_type"]
          updated_at?: string | null
          user_assessment_id?: string | null
          user_id?: string | null
          value?: number
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_entries_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_entries_user_assessment_id_fkey"
            columns: ["user_assessment_id"]
            isOneToOne: false
            referencedRelation: "user_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_entries_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          created_at: string | null
          higher_is_better: boolean
          id: string
          slug: string
          unit: Database["public"]["Enums"]["metric_unit"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          higher_is_better?: boolean
          id?: string
          slug: string
          unit: Database["public"]["Enums"]["metric_unit"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          higher_is_better?: boolean
          id?: string
          slug?: string
          unit?: Database["public"]["Enums"]["metric_unit"]
          updated_at?: string | null
        }
        Relationships: []
      }
      sport_category_relevance: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          relevance: number
          sport_id: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          relevance: number
          sport_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          relevance?: number
          sport_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sport_category_relevance_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sport_category_relevance_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          created_at: string | null
          group_name: string
          id: string
          name_i18n: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_name: string
          id?: string
          name_i18n?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_name?: string
          id?: string
          name_i18n?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_assessments: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assessments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_category_level_history: {
        Row: {
          category_id: string | null
          id: string
          level_score: number
          recorded_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          id?: string
          level_score: number
          recorded_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          id?: string
          level_score?: number
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_level_history_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_level_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_category_levels: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          level_score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          level_score: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          level_score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_levels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_levels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_environments: {
        Row: {
          environment_id: string
          user_id: string
        }
        Insert: {
          environment_id: string
          user_id: string
        }
        Update: {
          environment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_environments_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_environments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_equipments: {
        Row: {
          created_at: string | null
          equipment_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_equipments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_equipments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          email: string
          first_name: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          has_onboarded: boolean | null
          height_in_cm: number | null
          id: string
          last_active_at: string | null
          last_name: string | null
          preferred_language: string | null
          preferred_session_duration:
            | Database["public"]["Enums"]["session_duration"]
            | null
          preferred_workout_days: number[] | null
          push_token: string | null
          role: string
          schedule_notes: string | null
          sport_id: string | null
          timezone: string | null
          updated_at: string | null
          weight_in_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          has_onboarded?: boolean | null
          height_in_cm?: number | null
          id?: string
          last_active_at?: string | null
          last_name?: string | null
          preferred_language?: string | null
          preferred_session_duration?:
            | Database["public"]["Enums"]["session_duration"]
            | null
          preferred_workout_days?: number[] | null
          push_token?: string | null
          role?: string
          schedule_notes?: string | null
          sport_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          weight_in_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          has_onboarded?: boolean | null
          height_in_cm?: number | null
          id?: string
          last_active_at?: string | null
          last_name?: string | null
          preferred_language?: string | null
          preferred_session_duration?:
            | Database["public"]["Enums"]["session_duration"]
            | null
          preferred_workout_days?: number[] | null
          push_token?: string | null
          role?: string
          schedule_notes?: string | null
          sport_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          weight_in_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      user_targeted_categories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          priority: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          priority?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          priority?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_targeted_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_targeted_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_session_block_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          target_distance_meters: number | null
          target_duration_seconds: number | null
          target_load_type: Database["public"]["Enums"]["load_type"] | null
          target_load_value: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_rest_seconds: number | null
          target_sets: number | null
          updated_at: string
          workout_plan_session_block_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          order_index: number
          target_distance_meters?: number | null
          target_duration_seconds?: number | null
          target_load_type?: Database["public"]["Enums"]["load_type"] | null
          target_load_value?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rest_seconds?: number | null
          target_sets?: number | null
          updated_at?: string
          workout_plan_session_block_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          target_distance_meters?: number | null
          target_duration_seconds?: number | null
          target_load_type?: Database["public"]["Enums"]["load_type"] | null
          target_load_value?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rest_seconds?: number | null
          target_sets?: number | null
          updated_at?: string
          workout_plan_session_block_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_session_block_ex_workout_plan_session_block_i_fkey"
            columns: ["workout_plan_session_block_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_session_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_session_block_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_session_blocks: {
        Row: {
          block_type_id: string | null
          created_at: string | null
          focused_category_id: string | null
          id: string
          order_index: number
          updated_at: string | null
          workout_plan_session_id: string | null
        }
        Insert: {
          block_type_id?: string | null
          created_at?: string | null
          focused_category_id?: string | null
          id?: string
          order_index: number
          updated_at?: string | null
          workout_plan_session_id?: string | null
        }
        Update: {
          block_type_id?: string | null
          created_at?: string | null
          focused_category_id?: string | null
          id?: string
          order_index?: number
          updated_at?: string | null
          workout_plan_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_session_blocks_block_type_id_fkey"
            columns: ["block_type_id"]
            isOneToOne: false
            referencedRelation: "block_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_session_blocks_focused_category_id_fkey"
            columns: ["focused_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_session_blocks_workout_plan_session_id_fkey"
            columns: ["workout_plan_session_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_sessions: {
        Row: {
          created_at: string | null
          day_of_week: number
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          name: string
          order_index: number
          plan_id: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name: string
          order_index: number
          plan_id?: string | null
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name?: string
          order_index?: number
          plan_id?: string | null
          session_type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_targeted_categories: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          priority: number
          updated_at: string | null
          workout_plan_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          priority: number
          updated_at?: string | null
          workout_plan_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          priority?: number
          updated_at?: string | null
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_targeted_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_targeted_categories_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string | null
          description: string | null
          duration_weeks: number
          end_date: string
          id: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["plan_status"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_weeks: number
          end_date: string
          id?: string
          name: string
          start_date: string
          status: Database["public"]["Enums"]["plan_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_weeks?: number
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session_block_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          order_index: number
          recommended_load_value: number | null
          target_distance_meters: number | null
          target_duration_seconds: number | null
          target_load_type: Database["public"]["Enums"]["load_type"] | null
          target_load_value: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_rest_seconds: number | null
          target_sets: number | null
          updated_at: string
          workout_plan_session_block_exercise_id: string | null
          workout_plan_session_block_id: string | null
          workout_session_block_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          order_index: number
          recommended_load_value?: number | null
          target_distance_meters?: number | null
          target_duration_seconds?: number | null
          target_load_type?: Database["public"]["Enums"]["load_type"] | null
          target_load_value?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rest_seconds?: number | null
          target_sets?: number | null
          updated_at?: string
          workout_plan_session_block_exercise_id?: string | null
          workout_plan_session_block_id?: string | null
          workout_session_block_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          order_index?: number
          recommended_load_value?: number | null
          target_distance_meters?: number | null
          target_duration_seconds?: number | null
          target_load_type?: Database["public"]["Enums"]["load_type"] | null
          target_load_value?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rest_seconds?: number | null
          target_sets?: number | null
          updated_at?: string
          workout_plan_session_block_exercise_id?: string | null
          workout_plan_session_block_id?: string | null
          workout_session_block_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_block_exercis_workout_plan_session_block_e_fkey"
            columns: ["workout_plan_session_block_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_session_block_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_block_exercis_workout_plan_session_block_i_fkey"
            columns: ["workout_plan_session_block_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_session_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_block_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_block_exercises_workout_session_block_id_fkey"
            columns: ["workout_session_block_id"]
            isOneToOne: false
            referencedRelation: "workout_session_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session_blocks: {
        Row: {
          block_type_id: string | null
          created_at: string | null
          focused_category_id: string | null
          id: string
          order_index: number
          updated_at: string | null
          workout_plan_session_block_id: string | null
          workout_session_id: string | null
        }
        Insert: {
          block_type_id?: string | null
          created_at?: string | null
          focused_category_id?: string | null
          id?: string
          order_index: number
          updated_at?: string | null
          workout_plan_session_block_id?: string | null
          workout_session_id?: string | null
        }
        Update: {
          block_type_id?: string | null
          created_at?: string | null
          focused_category_id?: string | null
          id?: string
          order_index?: number
          updated_at?: string | null
          workout_plan_session_block_id?: string | null
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_blocks_block_type_id_fkey"
            columns: ["block_type_id"]
            isOneToOne: false
            referencedRelation: "block_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_blocks_focused_category_id_fkey"
            columns: ["focused_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_blocks_workout_plan_session_block_id_fkey"
            columns: ["workout_plan_session_block_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_session_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_blocks_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session_performed_sets: {
        Row: {
          created_at: string
          id: string
          performed_distance_meters: number | null
          performed_duration_seconds: number | null
          performed_load_value: number | null
          performed_reps: number | null
          performed_rpe: number | null
          set_number: number
          updated_at: string
          workout_session_block_exercise_id: string
          workout_session_block_id: string
          workout_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          performed_distance_meters?: number | null
          performed_duration_seconds?: number | null
          performed_load_value?: number | null
          performed_reps?: number | null
          performed_rpe?: number | null
          set_number: number
          updated_at?: string
          workout_session_block_exercise_id: string
          workout_session_block_id: string
          workout_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          performed_distance_meters?: number | null
          performed_duration_seconds?: number | null
          performed_load_value?: number | null
          performed_reps?: number | null
          performed_rpe?: number | null
          set_number?: number
          updated_at?: string
          workout_session_block_exercise_id?: string
          workout_session_block_id?: string
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_performed_set_workout_session_block_exerci_fkey"
            columns: ["workout_session_block_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_session_block_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_performed_sets_workout_session_block_id_fkey"
            columns: ["workout_session_block_id"]
            isOneToOne: false
            referencedRelation: "workout_session_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_performed_sets_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_exercise_index: number
          current_set_number: number
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          name: string
          scheduled_at: string | null
          session_type: Database["public"]["Enums"]["session_type"] | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string | null
          user_id: string | null
          workout_plan_id: string | null
          workout_plan_session_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_exercise_index?: number
          current_set_number?: number
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name: string
          scheduled_at?: string | null
          session_type?: Database["public"]["Enums"]["session_type"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string | null
          user_id?: string | null
          workout_plan_id?: string | null
          workout_plan_session_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_exercise_index?: number
          current_set_number?: number
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          name?: string
          scheduled_at?: string | null
          session_type?: Database["public"]["Enums"]["session_type"] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string | null
          user_id?: string | null
          workout_plan_id?: string | null
          workout_plan_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_workout_plan_session_id_fkey"
            columns: ["workout_plan_session_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_auto_skip_missed_sessions: { Args: never; Returns: undefined }
      fn_create_user_assessments: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      fn_dev_seed_category_history: {
        Args: { p_days?: number; p_user_id: string }
        Returns: undefined
      }
      fn_renew_assessments_for_all_users: { Args: never; Returns: string[] }
      fn_take_category_level_snapshot: { Args: never; Returns: undefined }
      fn_take_user_category_level_snapshot: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      assessment_status: "pending" | "in_progress" | "completed"
      body_region:
        | "ankle"
        | "calf"
        | "knee"
        | "quad"
        | "hamstring"
        | "glute"
        | "hip"
        | "groin"
        | "lower_back"
        | "core"
        | "obliques"
        | "thoracic"
        | "upper_back"
        | "chest"
        | "shoulder"
        | "bicep"
        | "tricep"
        | "forearm"
        | "full_body"
        | "neck"
      gender: "male" | "female" | "other"
      load_type: "bodyweight" | "kg" | "percent_1rm" | "rpe" | "pace"
      metric_source_type: "manual" | "assessment" | "session" | "derived"
      metric_unit:
        | "kg"
        | "m"
        | "cm"
        | "s"
        | "min"
        | "hr"
        | "kcal"
        | "bpm"
        | "percent"
        | "count"
        | "other"
      movement_pattern:
        | "push"
        | "pull"
        | "legs"
        | "core"
        | "isometric"
        | "plyometric"
        | "mobility"
        | "cardio"
        | "other"
      plan_status: "draft" | "active" | "paused" | "completed" | "archived"
      session_duration: "30min" | "45min" | "60min" | "90min"
      session_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "skipped"
        | "cancelled"
      session_type: "training" | "recovery"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assessment_status: ["pending", "in_progress", "completed"],
      body_region: [
        "ankle",
        "calf",
        "knee",
        "quad",
        "hamstring",
        "glute",
        "hip",
        "groin",
        "lower_back",
        "core",
        "obliques",
        "thoracic",
        "upper_back",
        "chest",
        "shoulder",
        "bicep",
        "tricep",
        "forearm",
        "full_body",
        "neck",
      ],
      gender: ["male", "female", "other"],
      load_type: ["bodyweight", "kg", "percent_1rm", "rpe", "pace"],
      metric_source_type: ["manual", "assessment", "session", "derived"],
      metric_unit: [
        "kg",
        "m",
        "cm",
        "s",
        "min",
        "hr",
        "kcal",
        "bpm",
        "percent",
        "count",
        "other",
      ],
      movement_pattern: [
        "push",
        "pull",
        "legs",
        "core",
        "isometric",
        "plyometric",
        "mobility",
        "cardio",
        "other",
      ],
      plan_status: ["draft", "active", "paused", "completed", "archived"],
      session_duration: ["30min", "45min", "60min", "90min"],
      session_status: [
        "scheduled",
        "in_progress",
        "completed",
        "skipped",
        "cancelled",
      ],
      session_type: ["training", "recovery"],
    },
  },
} as const
