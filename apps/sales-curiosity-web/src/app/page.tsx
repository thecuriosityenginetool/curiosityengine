'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import LogoCarousel from '@/components/ui/LogoCarousel';

type TabType = 'home' | 'context' | 'integrations';
type ActionType = 'analyze' | 'email';

// Typewriter hook for rotating text
function useTypewriter(words: string[], typingSpeed = 150, deletingSpeed = 100, pauseTime = 2000) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[currentWordIndex];
    
    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < currentWord.length) {
          setCurrentText(currentWord.slice(0, currentText.length + 1));
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentWord.slice(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  return currentText;
}

export default function Home() {
  // Use NextAuth session - this is the magic!
  const { data: session, status } = useSession();
  
  // Typewriter effect for role titles
  const roles = ['Lead Gen', 'Account Execs', 'Sales Managers', 'Teams', 'Founders'];
  const currentRole = useTypewriter(roles);
  
  // Mouse tracking for gradient
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [emailContext, setEmailContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Context state
  const [aboutMe, setAboutMe] = useState('');
  const [objectives, setObjectives] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [contextMessage, setContextMessage] = useState('');
  
  // Stats
  const [userStats, setUserStats] = useState<any>(null);
  const [integrations, setIntegrations] = useState<string[]>([]);
  
  const router = useRouter();
  
  // NextAuth status: 'loading', 'authenticated', 'unauthenticated'
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('✅ NextAuth session active:', session.user.email);
      
      // Set user data from session (already has role, org info!)
      setUserData({
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.name,
        role: session.user.role,
        organizations: {
          id: session.user.organizationId,
          account_type: session.user.accountType,
          name: session.user.organizationName
        }
      });
      
      // Redirect org admins immediately
      if (session.user.role === 'org_admin' || session.user.role === 'super_admin') {
        console.log('🏢 Org admin detected, redirecting...');
        router.push('/admin/organization');
      }
    }
  }, [status, session, router]);

  // Mouse tracking effect for gradient
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Removed complex checkAuth - NextAuth handles it all!

  async function loadUserContext(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('user_context')
      .eq('id', userId)
      .single();

    if (data?.user_context) {
      setAboutMe(data.user_context.aboutMe || '');
      setObjectives(data.user_context.objectives || '');
    }
  }

  async function loadUserStats() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch('/api/user/stats', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      setUserStats(data);
    }
  }

  async function loadIntegrations() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch('/api/organization/integrations', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      setIntegrations(data.enabledIntegrations || []);
    }
  }

  async function handleSaveContext() {
    setContextLoading(true);
    setContextMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        setContextMessage('Please log in first');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ 
          user_context: { aboutMe, objectives } 
        })
        .eq('id', session.user.id);

      if (error) throw error;

      setContextMessage('✓ Context saved successfully!');
      setTimeout(() => setContextMessage(''), 3000);
    } catch (err: any) {
      setContextMessage('Error saving context: ' + err.message);
    } finally {
      setContextLoading(false);
    }
  }

  async function handleAnalyzeOrDraft() {
    if (!linkedinUrl.trim()) {
      setError('Please enter a LinkedIn URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🔍 Starting analysis for:', linkedinUrl);
      
      // Get session from manual storage
      const manualSessionKey = 'sb-mrdqdgztzwboglkrtaui-auth-token';
      const manualSessionData = typeof window !== 'undefined' ? localStorage.getItem(manualSessionKey) : null;
      
      let session = null;
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession) {
        session = supabaseSession;
      } else if (manualSessionData) {
        try {
          session = JSON.parse(manualSessionData);
        } catch (e) {
          console.error('Failed to parse session');
        }
      }
      
      if (!session) {
        setError('Please log in first');
        setLoading(false);
        return;
      }

      console.log('📡 Calling /api/prospects...');

      // Call prospects API with 60-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          linkedinUrl,
          action: actionType,
          userContext: { aboutMe, objectives },
          emailContext: actionType === 'email' ? emailContext : undefined,
          profileData: {
            // We don't have scraped data, so just use URL
            name: 'LinkedIn Profile',
            fullPageText: `LinkedIn profile: ${linkedinUrl}`
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('📥 Response status:', response.status);

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok && data.analysis) {
        console.log('✅ Analysis successful!');
        setResult({
          analysis: data.analysis,
          profileData: data.profileData
        });
        // Reload stats
        loadUserStats();
    } else {
        console.error('❌ Analysis failed:', data.error);
        setError(data.error || 'Failed to analyze profile');
      }
    } catch (err: any) {
      console.error('❌ Analysis error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out after 60 seconds. The AI might be slow - please try again.');
      } else {
        setError('Error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    console.log('Logging out with NextAuth...');
    
    try {
      // NextAuth signOut - automatically clears session
      const { signOut } = await import('next-auth/react');
      await signOut({ redirect: false });
      
      console.log('✅ Signed out, reloading');
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
      window.location.href = '/';
    }
  }

  // Loading state - NextAuth is checking session
  if (isLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </main>
    );
  }

  // Not authenticated - show modern landing page with white background
  if (!isAuthenticated || !session) {
    return (
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#F95B14]/10 via-white to-white h-screen flex flex-col">
          {/* Mouse-tracking gradient overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute h-[500px] w-[500px] rounded-full bg-gradient-to-b from-[#F95B14]/25 via-[#F95B14]/12 to-transparent blur-2xl transition-all duration-1000 ease-out"
              style={{
                left: `${mousePosition.x}px`,
                top: `${mousePosition.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 flex-1 flex flex-col justify-center py-16">
            <div className="mx-auto max-w-4xl text-center">
              {/* Logo with hover animation */}
              <div className="mb-8 flex justify-center group">
                <Image 
                  src="/fulllogo_transparent_nobuffer.png" 
                  alt="Sales Curiosity" 
                  width={280}
                  height={75}
                  priority
                  className="h-18 w-auto transition-all duration-300 group-hover:scale-105"
                />
              </div>

              <span className="inline-flex items-center rounded-full bg-[#F95B14]/10 px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-8 animate-pulse">
                New: AI-Powered Sales Automation
              </span>
              
              <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl lg:text-6xl mb-6 leading-tight">
                The AI Sales Assistant for{' '}
                <span className="text-[#F95B14] inline-block min-w-[280px] sm:min-w-[400px] text-center">
                  {currentRole}
                  <span className="animate-pulse">|</span>
                </span>
              </h1>
              
              <p className="text-lg text-gray-700 mb-10 leading-relaxed max-w-2xl mx-auto">
                <strong className="text-black">Auto-draft emails</strong> from LinkedIn profiles and CRM entries, <strong className="text-black">auto-research</strong> LinkedIn accounts and CRM deals, <strong className="text-black">enrich CRM leads</strong> with AI research and <strong className="text-black">generate messages</strong> to leads from your Outlook or Gmail.
              </p>

              {/* Try free with 1-click text */}
              <p className="text-base text-gray-600 mb-8">Try free with 1-click:</p>

              {/* CTA Buttons matching the image */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
                {/* Gmail Button */}
                <Link 
                  href="/signup?integration=gmail"
                  className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-300 hover:scale-105"
                >
                  <Image 
                    src="/Gmail Icon.svg" 
                    alt="Gmail" 
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="text-black font-medium">Gmail</span>
                </Link>
                
                {/* Outlook Button */}
                <Link 
                  href="/signup?integration=outlook"
                  className="flex items-center gap-3 px-6 py-3 bg-[#0078D4] rounded-lg hover:bg-[#106ebe] transition-all duration-300 hover:scale-105"
                >
                  <Image 
                    src="/Outlook_icon.svg" 
                    alt="Outlook" 
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="text-white font-medium">Outlook</span>
                </Link>
              </div>

              {/* Integration Logos Carousel */}
              <div className="flex flex-col items-center gap-6 mt-8">
                <p className="text-sm font-medium text-gray-700">Works seamlessly with</p>
                <LogoCarousel />
              </div>
            </div>
          </div>
        </section>

        {/* Value Prop: AI Trained on Your Voice */}
        <section className="relative mx-auto max-w-7xl px-6 py-24 bg-gray-50">
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-12 shadow-xl hover:shadow-2xl transition-shadow duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center rounded-full bg-[#F95B14]/10 px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-6">
                  🧠 AI That Sounds Like You
                </div>
                <h2 className="text-4xl font-bold text-black mb-6">
                  Your AI learns your voice from sent emails
                </h2>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  We train your account's AI on your actual sent emails, so every auto-drafted message sounds authentically like you. No robotic templates. No generic responses. Just your natural voice, scaled.
                </p>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3 group hover:translate-x-2 transition-transform duration-300">
                    <svg className="w-6 h-6 text-[#F95B14] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Analyzes your writing style, tone, and patterns</span>
                  </li>
                  <li className="flex items-start gap-3 group hover:translate-x-2 transition-transform duration-300">
                    <svg className="w-6 h-6 text-[#F95B14] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Maintains your personal brand across all communications</span>
                  </li>
                  <li className="flex items-start gap-3 group hover:translate-x-2 transition-transform duration-300">
                    <svg className="w-6 h-6 text-[#F95B14] flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Gets smarter with every email you send</span>
                  </li>
                </ul>
              </div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#F95B14] to-[#e04d0a] rounded-2xl opacity-20 group-hover:opacity-30 blur transition-opacity duration-500"></div>
                <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#F95B14] to-[#e04d0a] animate-pulse" />
                    <div>
                      <div className="text-sm font-semibold text-black">Your AI Assistant</div>
                      <div className="text-xs text-gray-500">Trained on 2,847 sent emails</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="leading-relaxed">"Hey Sarah,</p>
                    <p className="leading-relaxed">I noticed you're expanding into the enterprise market—congrats on the Series B! 🎉</p>
                    <p className="leading-relaxed">We helped a similar company in your space reduce their sales cycle by 40%. Would love to show you how...</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-[#F95B14] rounded-full animate-pulse"></span>
                    ✨ Drafted in your authentic voice
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chrome Extension Highlight */}
        <section className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-[#F95B14]/10 px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-6">
              🚀 Chrome Extension
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Analyze prospects in one click
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Install our Chrome extension and get instant AI-powered insights on any LinkedIn profile—no copy-pasting required.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-800 bg-gray-900/50 p-12 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F95B14]/10 text-[#F95B14] mb-4 mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Instant Analysis</h3>
                <p className="text-sm text-gray-400">
                  Get AI insights directly on LinkedIn profile pages in seconds
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F95B14]/10 text-[#F95B14] mb-4 mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Draft Emails</h3>
                <p className="text-sm text-gray-400">
                  Generate personalized outreach emails in your voice, instantly
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F95B14]/10 text-[#F95B14] mb-4 mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Sync to CRM</h3>
                <p className="text-sm text-gray-400">
                  Automatically save prospects and activities to your CRM
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/install"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#F95B14] text-white text-lg font-semibold rounded-lg hover:bg-[#e04d0a] transition-all shadow-lg shadow-[#F95B14]/30 hover:scale-105"
              >
                Download Chrome Extension
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-[#F95B14]/10 px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-6">
              🔌 Integrations
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Automate your entire sales stack
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Connect with the tools you already use. Our AI agents understand your pipeline, company context, and sales process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Gmail */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm hover:border-[#F95B14]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F95B14]/10 flex items-center justify-center text-2xl">
                  📧
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Gmail</h3>
                  <p className="text-xs text-gray-400">Email & Calendar</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Auto-draft replies, schedule meetings, and organize your inbox with AI
              </p>
            </div>

            {/* Outlook */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm hover:border-[#F95B14]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F95B14]/10 flex items-center justify-center text-2xl">
                  📨
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Outlook</h3>
                  <p className="text-xs text-gray-400">Email & Calendar</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Seamless integration with Microsoft 365 and Outlook calendar
              </p>
            </div>

            {/* HubSpot */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm hover:border-[#F95B14]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F95B14]/10 flex items-center justify-center text-2xl">
                  🎯
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">HubSpot</h3>
                  <p className="text-xs text-gray-400">CRM</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Sync contacts, deals, and activities automatically to HubSpot
              </p>
            </div>

            {/* Monday CRM */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm hover:border-[#F95B14]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F95B14]/10 flex items-center justify-center text-2xl">
                  📊
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Monday CRM</h3>
                  <p className="text-xs text-gray-400">CRM & Project Management</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Update deals, create tasks, and manage pipeline in Monday.com
              </p>
            </div>

            {/* Salesforce */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm hover:border-[#F95B14]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F95B14]/10 flex items-center justify-center text-2xl">
                  ☁️
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Salesforce</h3>
                  <p className="text-xs text-gray-400">CRM</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Deep integration with Salesforce for enterprise sales teams
              </p>
            </div>

            {/* LinkedIn */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm hover:border-[#F95B14]/50 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#F95B14]/10 flex items-center justify-center text-2xl">
                  💼
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">LinkedIn</h3>
                  <p className="text-xs text-gray-400">Sales Navigator</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">
                Analyze profiles and enrich your outreach with LinkedIn data
              </p>
            </div>
          </div>
        </section>

        {/* Features: Agentic Automation */}
        <section className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-[#F95B14]/10 px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-6">
              ⚡ Modern Agentic Automation
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              AI agents that know your business
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Not just another AI tool. Our agents understand your pipeline, company positioning, and sales methodology to work autonomously.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 backdrop-blur-sm">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-2xl font-bold text-white mb-4">Pipeline Intelligence</h3>
              <p className="text-gray-300 mb-4">
                Your AI knows where every deal stands, what stage prospects are in, and the best next actions to move them forward.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Automatic deal stage detection
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Smart follow-up timing
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority prospect identification
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 backdrop-blur-sm">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-4">Company Context</h3>
              <p className="text-gray-300 mb-4">
                Every message includes your company's value props, case studies, and positioning—automatically personalized for each prospect.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Industry-specific positioning
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Relevant case study matching
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Pain point identification
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 backdrop-blur-sm">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-2xl font-bold text-white mb-4">Sales Methodology</h3>
              <p className="text-gray-300 mb-4">
                Whether you use MEDDIC, Challenger, or your own framework—our AI adapts to your proven sales process.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Methodology-aligned questioning
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Qualification criteria checking
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Best practice recommendations
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 backdrop-blur-sm">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-4">Autonomous Actions</h3>
              <p className="text-gray-300 mb-4">
                From drafting emails to updating CRMs to scheduling meetings—your AI works 24/7 so you can focus on closing deals.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Automatic CRM updates
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Smart meeting scheduling
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F95B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Proactive follow-up reminders
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="rounded-3xl border border-[#F95B14]/30 bg-gradient-to-r from-[#F95B14]/20 to-[#e04d0a]/20 p-12 text-center backdrop-blur-sm">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to get your hour back?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of sales professionals who are closing more deals with less busywork.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup"
                className="px-8 py-4 bg-[#F95B14] text-white font-bold rounded-lg shadow-lg hover:bg-[#e04d0a] transition-all hover:scale-105 text-lg"
              >
                Start Free Trial
              </Link>
              <Link 
                href="/install"
                className="px-8 py-4 bg-white text-black font-semibold rounded-lg border border-gray-200 transition-all hover:bg-gray-100 text-lg"
              >
                Get Chrome Extension
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-400">
              No credit card required • 7-day free trial • Cancel anytime
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-24">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <Image 
                  src="/icononly_transparent_nobuffer.png" 
                  alt="Sales Curiosity Icon" 
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <div className="text-gray-400 text-sm">
                  © 2025 Sales Curiosity. All rights reserved.
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition">
                  Privacy
                </Link>
                <Link href="/signup" className="text-gray-400 hover:text-white transition">
                  Terms
                </Link>
                <Link href="/install" className="text-gray-400 hover:text-white transition">
                  Download Extension
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  // Authenticated - show app features (keeping existing functionality with brand colors)
  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[80rem] rounded-full bg-[#F95B14]/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col items-start gap-4 sm:gap-6">
            <div className="w-full">
              {/* Logo */}
              <div className="mb-6">
                <Image 
                  src="/fulllogo_transparent_nobuffer.png" 
                  alt="Sales Curiosity" 
                  width={200}
                  height={50}
                  className="h-12 w-auto"
                />
              </div>

              {/* Account Type Badge */}
              {userData?.organizations?.account_type === 'individual' ? (
                <span className="inline-flex items-center rounded-full bg-[#F95B14]/10 px-3 py-1 text-xs font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20">
                  👤 Personal Workspace
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[#F95B14]/10 px-3 py-1 text-xs font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20">
                    🏢 {userData?.organizations?.name}
                  </span>
                  {userData?.role === 'org_admin' && (
                    <span className="inline-flex items-center rounded-full bg-[#F95B14]/20 px-2 py-1 text-xs font-bold text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/30">
                      ADMIN
                    </span>
                  )}
                  {userData?.role === 'member' && (
                    <span className="inline-flex items-center rounded-full bg-gray-800 px-2 py-1 text-xs font-medium text-gray-300 ring-1 ring-inset ring-gray-700">
                      Member
              </span>
                  )}
                </div>
              )}
              <p className="mt-4 max-w-xl text-xs sm:text-sm text-gray-400">
                {userData?.organizations?.account_type === 'individual' 
                  ? 'Craft compelling outreach with LinkedIn context and your voice.'
                  : `Team workspace for ${userData?.organizations?.name}. Collaborate and track team activity.`
                }
              </p>
            </div>
            {/* Admin Dashboard Link */}
            {(userData?.role === 'org_admin' || userData?.role === 'super_admin') && (
              <Link 
                href="/admin/organization"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#F95B14] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-[#F95B14]/30 transition-all hover:bg-[#e04d0a] hover:shadow-[#F95B14]/50 hover:scale-105"
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Organization Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Navigation Tabs - Mobile Responsive */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:gap-6 border-b border-gray-800">
          <div className="flex gap-2 sm:gap-6 overflow-x-auto">
            {(['home', 'context', 'integrations'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setError('');
                  setResult(null);
                  setActionType(null);
                }}
                className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold capitalize transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-[#F95B14] text-[#F95B14]'
                    : 'border-b-2 border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">{tab === 'home' && '🏠 '} {tab === 'context' && '👤 '} {tab === 'integrations' && '🔌 '}</span>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs sm:text-sm text-gray-400 hover:text-white transition self-end sm:self-auto"
          >
            Logout
          </button>
        </div>
      </section>

      {/* Tab Content - Mobile Responsive */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 pb-12 sm:pb-16">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="max-w-4xl mx-auto">
            {/* Stats Card */}
            {userStats && !result && (
              <div className="mb-4 sm:mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 shadow-xl backdrop-blur">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
                  {userStats.teamStats ? '📊 Team Activity' : '📈 Your Activity'}
                </h3>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="bg-[#F95B14]/10 border border-[#F95B14]/20 rounded-lg p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-[#F95B14] mb-1">
                      {userStats.userStats?.analysesCount || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      Profile{userStats.userStats?.analysesCount === 1 ? '' : 's'} Analyzed
                    </div>
                  </div>
                  <div className="bg-[#F95B14]/10 border border-[#F95B14]/20 rounded-lg p-3 sm:p-4">
                    <div className="text-2xl sm:text-3xl font-bold text-[#F95B14] mb-1">
                      {userStats.userStats?.emailsCount || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      Email{userStats.userStats?.emailsCount === 1 ? '' : 's'} Drafted
                    </div>
                  </div>
                </div>

                {userStats.teamStats && (
                  <div className="border-t border-gray-800 pt-3 sm:pt-4 mt-3 sm:mt-4">
                    <div className="text-xs sm:text-sm font-semibold text-gray-400 mb-2 sm:mb-3">Team Overview</div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-[#F95B14]">{userStats.teamStats.activeMembers}</div>
                        <div className="text-xs text-gray-500">Member{userStats.teamStats.activeMembers === 1 ? '' : 's'}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-[#F95B14]">{userStats.teamStats.totalAnalyses}</div>
                        <div className="text-xs text-gray-500">Analyses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-[#F95B14]">{userStats.teamStats.totalEmails}</div>
                        <div className="text-xs text-gray-500">Emails</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LinkedIn URL Input */}
            {!actionType && !result && (
              <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 shadow-xl backdrop-blur">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">LinkedIn Profile Analysis</h2>
                <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                  Enter a LinkedIn profile URL to analyze with AI or draft a personalized email.
                </p>
                
                <div className="mb-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">LinkedIn URL</label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/username"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F95B14]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <button
                    onClick={() => setActionType('analyze')}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#F95B14] to-[#e04d0a] text-white text-sm sm:text-base font-semibold rounded-lg hover:from-[#e04d0a] hover:to-[#d04409] transition-all shadow-lg shadow-[#F95B14]/30"
                  >
                    🔍 Analyze Profile
                  </button>
                  <button
                    onClick={() => setActionType('email')}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-black text-sm sm:text-base font-semibold rounded-lg hover:bg-gray-100 transition-all"
                  >
                    ✉️ Draft Email
                  </button>
                </div>
              </div>
            )}

            {/* Email Context Input */}
            {actionType === 'email' && !result && (
              <div className="mt-4 sm:mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 shadow-xl backdrop-blur">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Email Context (Optional)</h3>
                <textarea
                  value={emailContext}
                  onChange={(e) => setEmailContext(e.target.value)}
                  placeholder="Add specific context about how you'd like to approach this email..."
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F95B14] resize-none"
                />
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    onClick={handleAnalyzeOrDraft}
                    disabled={loading}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#F95B14] to-[#e04d0a] text-white text-sm sm:text-base font-semibold rounded-lg hover:from-[#e04d0a] hover:to-[#d04409] transition-all shadow-lg shadow-[#F95B14]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Drafting...' : 'Generate Email'}
                  </button>
                  <button
                    onClick={() => {
                      setActionType(null);
                      setEmailContext('');
                    }}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-800 text-gray-300 text-sm sm:text-base font-semibold rounded-lg hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Analyze Confirmation */}
            {actionType === 'analyze' && !result && (
              <div className="mt-4 sm:mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 shadow-xl backdrop-blur">
                <p className="text-xs sm:text-sm text-gray-300 mb-4">
                  Ready to analyze this LinkedIn profile with AI insights?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAnalyzeOrDraft}
                    disabled={loading}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#F95B14] to-[#e04d0a] text-white text-sm sm:text-base font-semibold rounded-lg hover:from-[#e04d0a] hover:to-[#d04409] transition-all shadow-lg shadow-[#F95B14]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Analyzing...' : 'Start Analysis'}
                  </button>
                  <button
                    onClick={() => setActionType(null)}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-800 text-gray-300 text-sm sm:text-base font-semibold rounded-lg hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 sm:mt-6 rounded-xl border border-red-800 bg-red-900/20 p-3 sm:p-4">
                <p className="text-red-400 text-xs sm:text-sm">❌ {error}</p>
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div className="mt-4 sm:mt-6 rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden shadow-xl backdrop-blur">
                <div className="bg-gradient-to-r from-[#F95B14] to-[#e04d0a] p-3 sm:p-4 flex justify-between items-center">
                  <h3 className="text-white text-sm sm:text-base font-semibold">✨ AI Results</h3>
                  <button
                    onClick={() => {
                      setResult(null);
                      setActionType(null);
                      setLinkedinUrl('');
                      setEmailContext('');
                    }}
                    className="text-white/80 hover:text-white transition text-lg sm:text-xl"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 sm:p-6 text-gray-300 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed max-h-96 overflow-y-auto">
                  {result.analysis}
                </div>
              </div>
            )}

            {/* Extension Download CTA */}
            <div className="mt-6 sm:mt-8 rounded-xl border border-[#F95B14]/30 bg-[#F95B14]/10 p-4 sm:p-6 shadow-xl backdrop-blur">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="text-3xl sm:text-4xl">🚀</div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Get the Chrome Extension</h3>
                  <p className="text-xs sm:text-sm text-gray-400 mb-4">
                    Analyze LinkedIn profiles directly from any profile page. No copy-pasting URLs needed!
                  </p>
                  <Link
                    href="/install"
                    className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#F95B14] text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-[#e04d0a] transition-all shadow-lg shadow-[#F95B14]/30"
                  >
                    Download Extension
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Context Tab - Mobile Responsive */}
        {activeTab === 'context' && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 shadow-xl backdrop-blur">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-2">Your Context</h2>
              <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
                This information will be used to personalize AI-generated analyses and emails.
              </p>

              {contextMessage && (
                <div className={`mb-4 p-3 rounded-lg text-xs sm:text-sm ${
                  contextMessage.includes('✓')
                    ? 'bg-[#F95B14]/10 border border-[#F95B14]/20 text-[#F95B14]'
                    : 'bg-red-900/20 border border-red-800 text-red-400'
                }`}>
                  {contextMessage}
                </div>
              )}

              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">About Me</label>
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  placeholder="Describe your role, company, and what you do..."
                  rows={5}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F95B14] resize-none"
                />
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">My Objectives</label>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="What are your sales goals and what you're looking to achieve..."
                  rows={5}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F95B14] resize-none"
                />
              </div>

              <button
                onClick={handleSaveContext}
                disabled={contextLoading}
                className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#F95B14] to-[#e04d0a] text-white text-sm sm:text-base font-semibold rounded-lg hover:from-[#e04d0a] hover:to-[#d04409] transition-all shadow-lg shadow-[#F95B14]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {contextLoading ? 'Saving...' : 'Save Context'}
              </button>
            </div>
          </div>
        )}

        {/* Integrations Tab - Mobile Responsive */}
        {activeTab === 'integrations' && (
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 shadow-xl backdrop-blur mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-2">Integrations</h2>
              <p className="text-xs sm:text-sm text-gray-400">
                {userData?.organizations?.account_type === 'individual'
                  ? 'Connect your tools to streamline your workflow.'
                  : userData?.role === 'org_admin'
                  ? 'Manage integrations for your organization from the admin dashboard.'
                  : 'Your organization admin manages which integrations are available to your team.'}
              </p>
            </div>

            {/* Admin Link */}
            {userData?.role === 'org_admin' && (
              <div className="mb-4 sm:mb-6 rounded-xl border border-[#F95B14]/30 bg-[#F95B14]/10 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-xs sm:text-sm text-[#F95B14]">Enable integrations for your team</span>
                <Link
                  href="/admin/organization"
                  className="w-full sm:w-auto text-center px-4 py-2 bg-[#F95B14] text-white rounded-lg hover:bg-[#e04d0a] transition font-semibold text-xs sm:text-sm"
                >
                  Open Dashboard
                </Link>
              </div>
            )}

            {/* Salesforce Integration - Available for ALL Users */}
            <div className="mb-4 sm:mb-6 rounded-xl border border-[#00A1E0]/30 bg-[#00A1E0]/10 p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-[#00A1E0]">
                <strong>💡 Salesforce CRM:</strong> Connect your Salesforce account from the Chrome extension (Integrations tab) for intelligent, CRM-aware email drafting.
              </p>
            </div>

            {/* Integration cards for individual users */}
            {userData?.organizations?.account_type === 'individual' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 shadow-xl backdrop-blur">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="text-3xl sm:text-4xl">📧</div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-white">Email Integration</h3>
                      <p className="text-xs text-gray-400">Gmail, Outlook, and more</p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                    Send drafted emails directly to your email client.
                  </p>
                  <div className="inline-block px-3 py-1 bg-yellow-900/20 border border-yellow-800 rounded text-yellow-400 text-xs font-semibold">
                    Coming Soon
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 shadow-xl backdrop-blur">
                  <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="text-3xl sm:text-4xl">🔗</div>
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-white">CRM Integration</h3>
                      <p className="text-xs text-gray-400">Salesforce, HubSpot, and more</p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                    Automatically sync profiles and activities to your CRM.
                  </p>
                  <div className="inline-block px-3 py-1 bg-yellow-900/20 border border-yellow-800 rounded text-yellow-400 text-xs font-semibold">
                    Coming Soon
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

