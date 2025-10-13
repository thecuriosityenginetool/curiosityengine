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
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    AzureAD({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      authorization: {
        params: {
          scope: "openid email profile offline_access",
          // Remove prompt: "consent" to not ask every time
          response_type: "code",
        }
      },
      // Explicitly set the wellKnown endpoint
      wellKnown: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || "common"}/v2.0/.well-known/openid-configuration`,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 OAuth SignIn callback for:', user.email, 'provider:', account?.provider);
      
      if (!user.email) {
        console.error('[AUTH] No email in user object');
        return false;
      }

      // Check if Supabase is configured
      if (!supabaseUrl || !serviceRoleKey) {
        console.error('[AUTH] Supabase not configured, but allowing sign in');
        return true;
      }

      try {
        // Check if user exists
        const { data: existingUser, error: selectError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid error on no results

        if (selectError) {
          console.error('[AUTH] Error checking user:', selectError);
        }

        if (!existingUser) {
          // Create new user - generate a UUID for them
          console.log('[AUTH] Creating new user:', user.email);
          
          // Generate a UUID for the new user (since we're not using Supabase Auth)
          const userId = crypto.randomUUID();
          
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: user.email,
              full_name: user.name || user.email?.split('@')[0],
              role: 'member',
              is_active: true,
              email_provider: account?.provider === 'azure-ad' ? 'microsoft' : account?.provider || 'google',
            });

          if (createError) {
            console.error('[AUTH] Create user error:', createError.message);
            console.error('[AUTH] Create user details:', createError);
            // Still allow sign in even if user creation fails
          } else {
            console.log('[AUTH] ✅ User created successfully with ID:', userId);
          }
        } else {
          console.log('[AUTH] ✅ Existing user found:', existingUser.id);
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
        console.log('[AUTH] JWT callback for:', user.email);
        
        // Set basic user info from OAuth provider
        token.email = user.email;
        token.name = user.name;
        
        try {
          // Fetch user data from database if Supabase is configured
          if (supabaseUrl && serviceRoleKey) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, full_name, role, organization_id')
              .eq('email', user.email)
              .single();

            if (!userError && userData) {
              console.log('[AUTH] ✅ User data loaded:', userData.id);
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
            } else {
              console.error('[AUTH] Error loading user data:', userError);
              // Set defaults if user data not found
              token.role = 'member';
              token.accountType = 'individual';
            }
          } else {
            console.log('[AUTH] Supabase not configured, using basic OAuth data');
            token.role = 'member';
            token.accountType = 'individual';
          }
        } catch (error) {
          console.error('[AUTH] Exception in jwt callback:', error);
          // Set safe defaults
          token.role = 'member';
          token.accountType = 'individual';
        }
      }

      // Add OAuth tokens to JWT for API access
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        
        // Store OAuth tokens in database for email sending
        if (token.id && account.access_token && supabaseUrl && serviceRoleKey) {
          const provider = account.provider === 'azure-ad' ? 'microsoft' : account.provider;
          
          // Calculate token expiry (default 1 hour if not provided)
          const expiresIn = account.expires_in || 3600;
          const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
          
          // Upsert tokens to database
          await supabase
            .from('user_oauth_tokens')
            .upsert({
              user_id: token.id as string,
              provider: provider,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              token_expiry: tokenExpiry.toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,provider'
            });
          
          console.log('[AUTH] ✅ OAuth tokens stored for:', user.email);
        }
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
      console.error('NextAuth Error:', code);
      console.error('NextAuth Error Details:', JSON.stringify(metadata, null, 2));
      if (metadata && typeof metadata === 'object' && 'cause' in metadata) {
        console.error('NextAuth Error Cause:', metadata.cause);
      }
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata);
    }
  },
});
