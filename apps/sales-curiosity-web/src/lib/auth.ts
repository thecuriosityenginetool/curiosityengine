import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role - MUST bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('🔧 NextAuth config - Using service role:', !!serviceRoleKey);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔐 NextAuth authorize called for:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.error('❌ Missing credentials');
          return null;
        }

        try {
          console.log('[AUTH-1] Looking up user in database by email...');
          
          // First, get user from database by email (service role bypasses RLS)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name, role, organization_id')
            .eq('email', credentials.email as string)
            .single();

          if (userError) {
            console.error('[AUTH-2] Database error:', userError.message);
            return null;
          }

          if (!userData) {
            console.error('[AUTH-3] User not found in database');
            return null;
          }

          console.log('[AUTH-4] User found in database:', userData.email);

          // Now validate password with Supabase admin API
          console.log('[AUTH-5] Validating password...');
          
          // Use admin signInWithPassword or verify manually
          // Create a temporary client to test password
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          // Important: Sign out immediately to not pollute the service role client
          if (authData?.session) {
            await supabase.auth.signOut();
          }

          if (authError) {
            console.error('[AUTH-6] Password validation failed:', authError.message);
            return null;
          }

          console.log('[AUTH-7] Password validated successfully');

          // Get organization (using service role)
          console.log('[AUTH-8] Fetching organization...');
          const { data: orgData } = await supabase
            .from('organizations')
            .select('name, account_type')
            .eq('id', userData.organization_id)
            .single();

          console.log('[AUTH-9] Organization:', orgData?.name || 'Not found');

          // Return user object that will be stored in session
          return {
            id: userData.id,
            email: userData.email,
            name: userData.full_name || userData.email,
            role: userData.role,
            organizationId: userData.organization_id,
            organizationName: orgData?.name || 'Organization',
            accountType: orgData?.account_type || 'individual',
          };
        } catch (error) {
          console.error('❌ [AUTH-ERROR] Exception:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to token on sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.accountType = user.accountType;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user data to session
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.accountType = token.accountType as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this-in-production',
  debug: true, // Enable debug mode to see server logs
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata);
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata);
    }
  },
});

