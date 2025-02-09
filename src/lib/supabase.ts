import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please connect to Supabase using the "Connect to Supabase" button.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'checkout-system@1.0.0',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Connection health check using a valid table
export async function checkConnection() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1)
      .single()

    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Supabase connection error:', err)
    return false
  }
}

// Retry mechanism for failed requests
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }

  throw lastError
}

// Initialize connection
checkConnection().then(connected => {
  if (!connected) {
    console.error('Failed to establish initial connection to Supabase. Please ensure you have connected to Supabase using the "Connect to Supabase" button.')
  }
})

// Export helper functions
export const withRetry = retryOperation