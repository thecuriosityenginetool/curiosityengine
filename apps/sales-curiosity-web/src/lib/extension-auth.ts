/**
 * Extension Authentication Helper
 * Validates extension auth tokens (base64 encoded user info)
 */

import { getSupabaseAdmin } from './supabase-server';

export interface ExtensionTokenPayload {
  userId: string;
  email: string;
  timestamp: number;
}

/**
 * Validate extension auth token (base64 encoded)
 * Returns user ID if valid, null if invalid
 */
export async function validateExtensionToken(token: string): Promise<string | null> {
  try {
    // Decode base64 token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload: ExtensionTokenPayload = JSON.parse(decoded);

    // Validate payload structure
    if (!payload.userId || !payload.email || !payload.timestamp) {
      console.log('❌ Invalid token structure');
      return null;
    }

    // Check if token is too old (24 hours)
    const tokenAge = Date.now() - payload.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge > maxAge) {
      console.log('❌ Token expired');
      return null;
    }

    // Verify user exists in database
    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', payload.userId)
      .eq('email', payload.email)
      .single();

    if (error || !user) {
      console.log('❌ User not found or mismatch');
      return null;
    }

    return payload.userId;
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return null;
  }
}

/**
 * Get user from extension token
 * Returns full user object if valid
 */
export async function getUserFromExtensionToken(token: string): Promise<any | null> {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload: ExtensionTokenPayload = JSON.parse(decoded);

    if (!payload.userId) return null;

    // Check token age
    const tokenAge = Date.now() - payload.timestamp;
    if (tokenAge > 24 * 60 * 60 * 1000) return null;

    // Get full user data
    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, organization_id')
      .eq('id', payload.userId)
      .single();

    if (error || !user) return null;

    return user;
  } catch (error) {
    return null;
  }
}

