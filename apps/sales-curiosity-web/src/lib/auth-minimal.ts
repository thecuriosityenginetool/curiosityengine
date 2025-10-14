import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";

// Minimal NextAuth configuration to test basic OAuth flow
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
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-testing',
  debug: true,
});
