'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

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
    <nav className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-medium">
          Sales Curiosity
        </Link>
        
        <div className="flex items-center gap-4 text-sm">
          <Link className="opacity-80 hover:opacity-100" href="/">
            Home
          </Link>
          
          {/* Show org admin link only for org_admin and super_admin */}
          {showOrgAdmin && (
            <Link 
              className="opacity-80 hover:opacity-100" 
              href="/admin/organization"
            >
              Organization
            </Link>
          )}
          
          {/* Auth buttons */}
          {status === 'loading' ? (
            <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          ) : isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              Logout
            </button>
          ) : (
            <>
              <Link 
                className="opacity-80 hover:opacity-100" 
                href="/login"
              >
                Login
              </Link>
              <Link 
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
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

