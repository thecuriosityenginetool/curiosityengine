import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role - MUST bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('🔧 NextAuth config - Using service role:', !!serviceRoleKey);
console.log('🔧 Microsoft Client ID configured:', !!process.env.MICROSOFT_CLIENT_ID);
console.log('🔧 Microsoft Client Secret configured:', !!process.env.MICROSOFT_CLIENT_SECRET);
console.log('🔧 Azure Tenant ID:', process.env.AZURE_AD_TENANT_ID || 'common');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AzureAD({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 OAuth SignIn callback for:', user.email, 'provider:', account?.provider);
      
      // Auto-create user in public.users on first OAuth login
      if (user.email) {
        try {
          console.log('👤 Ensuring user exists in public.users for:', user.email);
          
          // Normalize email to lowercase for consistency
          const normalizedEmail = user.email.toLowerCase();
          
          // Check if user already exists (case-insensitive)
          const { data: existing } = await supabase
            .from('users')
            .select('id, email')
            .ilike('email', normalizedEmail)
            .maybeSingle();
          
          if (!existing) {
            console.log('🆕 Creating NEW user record for:', normalizedEmail);
            
            // Create user record with lowercase email and explicit UUID
            const { data: newUser, error: insertError } = await supabase
              .from('users')
              .insert({
                id: crypto.randomUUID(), // Explicitly generate UUID
                email: normalizedEmail,
                full_name: user.name || user.email.split('@')[0] || 'User',
                role: 'org_admin', // OAuth signups are admins by default
                user_context: { aboutMe: '', objectives: '' }
              })
              .select()
              .single();
            
            if (insertError) {
              console.error('❌ Error creating user:', insertError);
            } else {
              console.log('✅ User record created successfully:', newUser.id);
            }
          } else {
            console.log('✅ User already exists:', existing.id);
          }
        } catch (error) {
          console.error('❌ Error in signIn callback:', error);
          // Don't block login if user creation fails - they can still sign in
        }
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.id = crypto.randomUUID();
      }
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        if (token.accessToken) {
          session.accessToken = token.accessToken as string;
        }
        if (token.provider) {
          session.provider = token.provider as string;
        }
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
});
