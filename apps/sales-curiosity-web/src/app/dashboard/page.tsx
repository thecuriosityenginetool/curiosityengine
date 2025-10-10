'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') {
      console.log('⏳ Dashboard waiting for session...');
      return;
    }
    
    if (status === 'unauthenticated' || !session) {
      console.log('❌ Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    console.log('✅ Session exists, routing based on role:', session.user.role);
    
    // Route based on role from session
    if (session.user.role === 'org_admin' || session.user.role === 'super_admin') {
      router.push('/admin/organization');
    } else {
      router.push('/');
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="animate-pulse text-slate-400">Redirecting...</div>
    </div>
  );
}

