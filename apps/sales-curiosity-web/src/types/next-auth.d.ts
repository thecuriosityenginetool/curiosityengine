import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      organizationId: string | null;
      organizationName: string | null;
      accountType: string;
    } & DefaultSession["user"]
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
  }

  interface User {
    id: string;
    role?: string;
    organizationId?: string | null;
    organizationName?: string | null;
    accountType?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    organizationId: string | null;
    organizationName: string | null;
    accountType: string;
    accessToken?: string;
    refreshToken?: string;
    provider?: string;
  }
}

