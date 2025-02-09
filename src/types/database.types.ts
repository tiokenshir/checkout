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
      customers: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string
          cpf: string
          phone: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email: string
          cpf: string
          phone: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string
          cpf?: string
          phone?: string
        }
      }
      products: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string
          price: number
          image_url: string
          type: 'product' | 'service'
          active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description: string
          price: number
          image_url: string
          type: 'product' | 'service'
          active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string
          price?: number
          image_url?: string
          type?: 'product' | 'service'
          active?: boolean
        }
      }
      orders: {
        Row: {
          id: string
          created_at: string
          customer_id: string
          product_id: string
          status: 'pending' | 'paid' | 'expired' | 'cancelled'
          payment_qr_code: string
          payment_code: string
          expires_at: string
          total_amount: number
        }
        Insert: {
          id?: string
          created_at?: string
          customer_id: string
          product_id: string
          status?: 'pending' | 'paid' | 'expired' | 'cancelled'
          payment_qr_code: string
          payment_code: string
          expires_at: string
          total_amount: number
        }
        Update: {
          id?: string
          created_at?: string
          customer_id?: string
          product_id?: string
          status?: 'pending' | 'paid' | 'expired' | 'cancelled'
          payment_qr_code?: string
          payment_code?: string
          expires_at?: string
          total_amount?: number
        }
      }
    }
  }
}