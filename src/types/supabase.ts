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
          full_name: string | null
          phone: string | null
          birth_year: number | null
          gender: 'male' | 'female' | null
          created_at: string
          updated_at: string
        }
        Insert: { id: string; [key: string]: any }
        Update: { id?: string; [key: string]: any }
      }
      contribution_periods: {
        Row: {
          id: string
          user_id: string
          type: 'bhxh' | 'bhtn'
          start_month: number
          start_year: number
          end_month: number
          end_year: number
          salary: number
          contribution_type: 'mandatory' | 'voluntary'
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: { user_id: string; [key: string]: any }
        Update: { id?: string; [key: string]: any }
      }
      calculation_results: {
        Row: {
          id: string
          user_id: string
          calculation_type: 'bhxh_one_time' | 'pension' | 'unemployment'
          input_data: Json
          result_data: Json
          created_at: string
        }
        Insert: { user_id: string; [key: string]: any }
        Update: { id?: string; [key: string]: any }
      }
      imported_files: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_type: string
          file_url: string | null
          parsed_data: Json | null
          status: 'pending' | 'success' | 'failed'
          created_at: string
        }
        Insert: { user_id: string; [key: string]: any }
        Update: { id?: string; [key: string]: any }
      }
    }
  }
}
