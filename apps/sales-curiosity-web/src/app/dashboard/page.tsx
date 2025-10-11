'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          router.push('/login');
          return;
        }

        if (session && session.user) {
          console.log('✅ Found existing session:', session.user.email);
          setUser(session.user);
          setLoading(false);
        } else {
          console.log('❌ No session found, redirecting to login');
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('❌ Error in getInitialSession:', error);
        router.push('/login');
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ User signed in:', session.user.email);
          setUser(session.user);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('❌ User signed out, redirecting to login');
          setUser(null);
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F95B14] mx-auto mb-4"></div>
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Authentication required</div>
          <div className="text-gray-600">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Curiosity Engine
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Hello {user.email}! You're successfully logged in.
          </p>
          <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Dashboard Coming Soon
            </h2>
            <p className="text-gray-600 mb-6">
              Your Curiosity Engine dashboard is being built. In the meantime, you can explore the main features.
            </p>
            <button 
              onClick={() => router.push('/')}
              className="bg-[#F95B14] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Back to Homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

