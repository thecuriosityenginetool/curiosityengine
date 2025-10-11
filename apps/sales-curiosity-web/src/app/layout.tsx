import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import ClientProviders from "@/components/ui/ClientProviders";
import ConditionalNavigation from "@/components/ui/ConditionalNavigation";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sales Curiosity - AI-Powered Sales Intelligence",
  description: "Transform LinkedIn profiles into actionable insights and personalized outreach emails",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased font-sans`}>
        <SessionProvider>
          <ConditionalNavigation />
          <ClientProviders>
            {children}
          </ClientProviders>
        </SessionProvider>
      </body>
    </html>
  );
}


