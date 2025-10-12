import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { Provider } from "next-auth/providers";
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

// Custom Microsoft provider (Azure AD)
const MicrosoftProvider: Provider = {
  id: "microsoft",
  name: "Microsoft",
  type: "oidc",
  issuer: "https://login.microsoftonline.com/common/v2.0",
  wellKnown: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
  authorization: {
    url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    params: {
      scope: "openid email profile offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.ReadWrite"
    }
  },
  token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  userinfo: "https://graph.microsoft.com/oidc/userinfo",
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: null,
    }
  },
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    MicrosoftProvider,
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 OAuth SignIn callback for:', user.email);
      
      if (!user.email) {
        console.error('[AUTH] No email in user object');
        return false;
      }

      try {
        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          // Create new user
          console.log('[AUTH] Creating new user:', user.email);
          
          const { error: createError } = await supabase
            .from('users')
            .insert({
              email: user.email,
              full_name: user.name || user.email?.split('@')[0],
              role: 'member',
              email_provider: account?.provider || 'google',
            });

          if (createError) {
            console.error('[AUTH] Create user error:', createError.message);
            // Still allow sign in even if user creation fails
          }
        }

        return true;
      } catch (error) {
        console.error('[AUTH] Exception in signIn:', error);
        // Allow sign in even if there's an error - NextAuth will handle it
        return true;
      }
    },
    async jwt({ token, user, account }) {
      // On initial sign in, add user data and tokens to JWT
      if (user && user.email) {
        try {
          // Fetch user data from database
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name, role, organization_id')
            .eq('email', user.email)
            .single();

          if (!userError && userData) {
            token.id = userData.id;
            token.role = userData.role;
            token.organizationId = userData.organization_id;
            
            // Fetch organization data if user is in an org
            if (userData.organization_id) {
              const { data: orgData } = await supabase
                .from('organizations')
                .select('name, account_type')
                .eq('id', userData.organization_id)
                .single();
              
              if (orgData) {
                token.organizationName = orgData.name;
                token.accountType = orgData.account_type;
              }
            } else {
              token.organizationName = null;
              token.accountType = 'individual';
            }
          }
        } catch (error) {
          console.error('[AUTH] Error in jwt callback:', error);
          // Return token as-is if there's an error
        }
      }

      // Add OAuth tokens to JWT for API access
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }

      return token;
    },
    async session({ session, token }) {
      // Add user data to session
      if (token && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || 'member';
        session.user.organizationId = (token.organizationId as string | null) || null;
        session.user.organizationName = (token.organizationName as string | null) || null;
        session.user.accountType = (token.accountType as string) || 'individual';
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
  debug: true,
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
