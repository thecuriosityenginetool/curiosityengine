import { createBrowserClient } from '@supabase/ssr';

// Create Supabase client - singleton pattern
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) {
    console.log('♻️ Reusing Supabase client');
    return client;
  }
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('❌ Missing Supabase env vars!', { url: !!url, key: !!key });
    throw new Error('Supabase environment variables not configured');
  }
  
  console.log('🆕 Creating Supabase client');
  
  client = createBrowserClient(url, key);
  
  console.log('✅ Supabase client created successfully');
  
  return client;
}

// Export singleton instance
export const supabase = createClient();

// Legacy function for compatibility
export function getSupabase() {
  return supabase;
}


