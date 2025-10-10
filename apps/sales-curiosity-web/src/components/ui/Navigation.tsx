'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navigation() {
  const { data: session, status } = useSession();

  async function handleLogout() {
    console.log('Navigation: Logging out...');
    
    try {
      await signOut({ redirect: false });
      console.log('✅ Signed out');
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/';
    }
  }

  const showOrgAdmin = session?.user?.role === 'org_admin' || session?.user?.role === 'super_admin';
  const isAuthenticated = status === 'authenticated';

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image 
            src="/icononly_transparent_nobuffer.png" 
            alt="Sales Curiosity" 
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="font-bold text-lg text-black">Sales Curiosity</span>
        </Link>
        
        <div className="flex items-center gap-6 text-sm">
          <Link className="text-gray-700 hover:text-black font-medium transition-colors" href="/">
            Home
          </Link>
          
          {/* Show org admin link only for org_admin and super_admin */}
          {showOrgAdmin && (
            <Link 
              className="text-gray-700 hover:text-black font-medium transition-colors" 
              href="/admin/organization"
            >
              Organization
            </Link>
          )}
          
          {/* Auth buttons */}
          {status === 'loading' ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />
          ) : isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          ) : (
            <>
              <Link 
                className="text-gray-700 hover:text-black font-semibold transition-colors" 
                href="/login"
              >
                Login
              </Link>
              <Link 
                className="rounded-lg bg-[#F95B14] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e04d0a] transition-all hover:scale-105 shadow-sm"
                href="/signup"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

