'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Navigation() {
  const { data: session, status } = useSession();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{
        background: 'transparent',
        borderBottom: 'none',
        backdropFilter: 'none'
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image 
            src="/icononly_transparent_nobuffer.png" 
            alt="Curiosity Engine" 
            width={40}
            height={40}
            className="w-10 h-10"
          />
        </Link>
        
        <div className="flex items-center gap-4 text-sm">
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
            <div className="flex items-center gap-4">
              <Link 
                className="group flex items-center gap-2 text-gray-700 hover:text-black font-semibold transition-all duration-300 hover:scale-105" 
                href="/login"
              >
                <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </Link>
              <Link 
                className="group relative rounded-lg bg-[#F95B14] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e04d0a] transition-all duration-300 hover:scale-105 shadow-sm overflow-hidden"
                href="/signup"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="flex items-center gap-2 relative z-10">
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Start Free Trial
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

