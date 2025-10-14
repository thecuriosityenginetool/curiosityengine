import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import ClientProviders from "@/components/ui/ClientProviders";
import ConditionalNavigation from "@/components/ui/ConditionalNavigation";
import Footer from "@/components/ui/Footer";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sales Curiosity - AI-Powered Sales Intelligence",
  description: "Transform LinkedIn profiles into actionable insights and personalized outreach emails",
  icons: {
    icon: '/icononly_transparent_nobuffer.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased font-sans flex flex-col min-h-screen`}>
        <SessionProvider>
          <ConditionalNavigation />
          <ClientProviders>
            <main className="flex-grow">
              {children}
            </main>
          </ClientProviders>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}


