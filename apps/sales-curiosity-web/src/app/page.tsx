'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import LogoCarousel from '@/components/ui/LogoCarousel';
import GSAPReveal from '@/components/ui/GSAPReveal';

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
  const [cardMousePositions, setCardMousePositions] = useState<{[key: string]: {x: number, y: number}}>({});
  
  // Typing animation for email text
  const [emailText, setEmailText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);
  
  // Fallback: Start animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasAnimated) {
        console.log('Fallback: Starting typing animation...');
        setHasAnimated(true);
        setIsTyping(true);
        setEmailText('');
        const fullText = "Hey Sarah,\n\nI noticed you're expanding into the enterprise market—congrats on the Series B! 🥳\n\nWe helped a similar company in your space reduce their sales cycle by 40%. Would love to show you how...";
        let currentIndex = 0;
        
        const typeInterval = setInterval(() => {
          if (currentIndex <= fullText.length) {
            setEmailText(fullText.slice(0, currentIndex));
            currentIndex++;
          } else {
            clearInterval(typeInterval);
            setTimeout(() => {
              setIsTyping(false);
            }, 1000);
          }
        }, 50);
      }
    }, 2000); // Start after 2 seconds if intersection observer doesn't trigger
    
    return () => clearTimeout(timer);
  }, [hasAnimated]);
  
  const [userData, setUserData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [emailContext, setEmailContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  // AI Model selection (only models that support tool/function calling)
  const [selectedModel, setSelectedModel] = useState('DeepSeek-R1-0528');
  const availableModels = [
    { id: 'DeepSeek-R1-0528', name: 'DeepSeek R1 (671B)', description: 'Most powerful - Best for complex reasoning' },
    { id: 'DeepSeek-V3-0324', name: 'DeepSeek V3', description: 'Powerful general-purpose model' },
    { id: 'DeepSeek-V3.1', name: 'DeepSeek V3.1', description: 'Latest DeepSeek version' },
    { id: 'Meta-Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', description: 'Fast and efficient - Great balance' },
    { id: 'Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', description: 'Ultra-fast - Simple tasks' },
  ];
  
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
      
      // Redirect based on role
      if (session.user.role === 'org_admin' || session.user.role === 'super_admin') {
        console.log('🏢 Org admin detected, redirecting...');
        router.push('/admin/organization');
      } else {
        // Regular members go to dashboard
        console.log('👤 Regular member, redirecting to dashboard...');
        router.push('/dashboard');
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

  // Typing animation effect for email text
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // console.log('Intersection observer triggered:', entry.isIntersecting, hasAnimated);
          if (entry.isIntersecting && !hasAnimated) {
            console.log('Starting typing animation...');
            setHasAnimated(true);
            setIsTyping(true);
            setEmailText(''); // Reset text
            const fullText = "Hey Sarah,\n\nI noticed you're expanding into the enterprise market—congrats on the Series B! 🥳\n\nWe helped a similar company in your space reduce their sales cycle by 40%. Would love to show you how...";
            let currentIndex = 0;
            
            const typeInterval = setInterval(() => {
              if (currentIndex <= fullText.length) {
                setEmailText(fullText.slice(0, currentIndex));
                currentIndex++;
              } else {
                clearInterval(typeInterval);
                // Keep the cursor for a moment after typing is complete
                setTimeout(() => {
                  setIsTyping(false);
                }, 1000);
              }
            }, 50); // Slightly slower for better readability
          }
        });
      },
      { threshold: 0.1 } // Lower threshold to trigger earlier
    );

    if (emailRef.current) {
      // console.log('Observing email element');
      observer.observe(emailRef.current);
    }

    return () => {
      if (emailRef.current) {
        observer.unobserve(emailRef.current);
      }
    };
  }, []); // Remove hasAnimated dependency to prevent recreating observer

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

      const response = await fetch('/api/user/context', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userContext: { aboutMe, objectives } 
        }),
      });

      if (response.ok) {
        setContextMessage('✓ Context saved successfully!');
        setTimeout(() => setContextMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setContextMessage('Error saving context: ' + (errorData.error || 'Unknown error'));
      }
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

  // Remove loading state - let the page load directly

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
              <div className="mb-8 flex justify-center group animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                <Image 
                  src="/fulllogo_transparent_nobuffer.png" 
                  alt="Sales Curiosity" 
                  width={280}
                  height={75}
                  priority
                  className="h-18 w-auto transition-all duration-300 group-hover:scale-105"
                />
              </div>

              <span className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-8 relative z-10 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                10x Your Sales Productivity
              </span>
              
              <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight animate-fade-in-up break-words" style={{animationDelay: '0.3s'}}>
                The AI Sales Assistant for{' '}
                <span className="text-[#F95B14] inline-block whitespace-nowrap">
                  {currentRole}
                  <span className="animate-pulse">|</span>
                </span>
              </h1>
              
              <p className="text-lg text-gray-700 mb-10 leading-relaxed max-w-2xl mx-auto animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                <strong className="text-black">Curiosity Engine is YOUR company's LLM</strong> - a vector database of your company info, trained on your brand voice, accessing your case studies, and creating compelling fits for prospects. <strong className="text-black">Auto-draft emails</strong> from LinkedIn profiles, <strong className="text-black">auto-research</strong> accounts, and <strong className="text-black">generate personalized messages</strong> that sound like you.
              </p>

              {/* Get started text */}
              <p className="text-base text-gray-600 mb-8 animate-fade-in-up" style={{animationDelay: '0.5s'}}>Get started in seconds:</p>

              {/* CTA Buttons matching the image */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                {/* Gmail Button */}
                <Link 
                  href="/signup?integration=gmail"
                  className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-300 hover:scale-105 relative z-10"
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
                  className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 text-gray-800 rounded-lg hover:shadow-md transition-all duration-300 hover:scale-105 relative z-10"
                >
                  <Image 
                    src="/Outlook_icon.svg" 
                    alt="Outlook" 
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="text-gray-800 font-medium">Outlook</span>
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* Integration Logos Carousel */}
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center gap-6">
              <p className="text-sm font-medium text-gray-700">Works seamlessly with</p>
              <LogoCarousel />
            </div>
          </div>
        </section>

        {/* AI Voice Learning Section */}
        <section className="relative mx-auto max-w-7xl px-6 py-24 bg-white">
          <GSAPReveal>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-black text-center mb-16 leading-tight">
              Curiosity Engine learns your voice from sent emails
            </h2>
          </GSAPReveal>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-6 relative z-10">
                🧠 AI That Sounds Like You
              </div>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  Try free and connect your email to train your personal AI assistant. Watch as it learns your unique writing style and drafts messages that sound exactly like you—no robotic templates, just your authentic voice at scale.
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
            <div className="bg-gray-50 rounded-2xl p-8" ref={emailRef}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="relative">
                      <Image 
                        src="/profile-pic.jpg" 
                        alt="AI Assistant" 
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#F95B14]"
                        onError={(e) => {
                          // Fallback to gradient circle if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'block';
                        }}
                      />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#F95B14] to-[#e04d0a] animate-pulse hidden"></div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-black">Your AI Assistant</div>
                      <div className="text-xs text-gray-500">Trained on 2,847 sent emails</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200 h-80 overflow-hidden">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line h-full overflow-y-auto">
                      {emailText || "Loading AI response..."}
                      {isTyping && <span className="animate-pulse">|</span>}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 rounded-full bg-[#F95B14]"></div>
                    <span>Drafted in your authentic voice</span>
                  </div>
              </div>
          </div>
        </section>

        {/* Chrome Extension Highlight */}
        <section className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-6 relative z-10">
              🚀 Chrome Extension
            </div>
            <GSAPReveal>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Your company's LLM in action
              </h2>
            </GSAPReveal>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Auto-draft emails from LinkedIn profiles, auto-research accounts, and generate personalized messages that sound like you.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F95B14]/10 text-[#F95B14] mb-4 mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">Brand-Trained Analysis</h3>
                <p className="text-sm text-gray-600">
                  AI trained on your company's voice analyzes prospects using your case studies and value props
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F95B14]/10 text-[#F95B14] mb-4 mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">Compelling Fits</h3>
                <p className="text-sm text-gray-600">
                  Create personalized outreach that references your specific case studies and solutions
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F95B14]/10 text-[#F95B14] mb-4 mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">Vector Database</h3>
                <p className="text-sm text-gray-600">
                  Your company's knowledge base grows with every interaction and material uploaded
                </p>
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
              {/* Google Sign Up */}
              <button
                onClick={() => window.location.href = '/signup'}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors bg-white"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </button>

              {/* Microsoft Sign Up */}
              <button
                onClick={() => window.location.href = '/signup'}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors bg-white"
              >
                <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Sign up with Microsoft
              </button>
            </div>
          </div>
        </section>

        {/* Connectors Section */}
        <section className="relative mx-auto max-w-7xl px-6 py-24 bg-white">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-6 relative z-10">
              🔌 Connectors
            </div>
            <GSAPReveal>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6 leading-tight">
                Curiosity Engine works with every tool you use
              </h2>
            </GSAPReveal>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Connect with the tools you already use. Our AI agents understand your pipeline, company context, and sales process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Salesforce */}
            <div 
              className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCardMousePositions(prev => ({
                  ...prev,
                  salesforce: {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  }
                }));
              }}
              onMouseLeave={() => {
                setCardMousePositions(prev => ({
                  ...prev,
                  salesforce: { x: 0, y: 0 }
                }));
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute h-32 w-32 rounded-full bg-gradient-to-b from-[#F95B14]/20 via-[#F95B14]/10 to-transparent blur-xl transition-all duration-500 ease-out pointer-events-none"
                style={{
                  left: `${cardMousePositions.salesforce?.x || 0}px`,
                  top: `${cardMousePositions.salesforce?.y || 0}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <Image 
                    src="/salesforcelogo.svg" 
                    alt="Salesforce" 
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-black">Salesforce</h3>
                    <p className="text-sm text-gray-600">CRM Integration</p>
                  </div>
                </div>
                <div className="space-y-3 text-gray-700">
                  <p className="text-sm leading-relaxed">
                    Extract live opportunity data and push AI-enriched recommendations back into your CRM with 1-click logging.
                  </p>
                  <p className="text-sm leading-relaxed">
                    Get contextual "next best step" insights by combining deal history with sales collateral and call notes.
                  </p>
                </div>
              </div>
            </div>

            {/* LinkedIn */}
            <div 
              className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCardMousePositions(prev => ({
                  ...prev,
                  linkedin: {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  }
                }));
              }}
              onMouseLeave={() => {
                setCardMousePositions(prev => ({
                  ...prev,
                  linkedin: { x: 0, y: 0 }
                }));
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute h-32 w-32 rounded-full bg-gradient-to-b from-[#F95B14]/20 via-[#F95B14]/10 to-transparent blur-xl transition-all duration-500 ease-out pointer-events-none"
                style={{
                  left: `${cardMousePositions.linkedin?.x || 0}px`,
                  top: `${cardMousePositions.linkedin?.y || 0}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-black">LinkedIn</h3>
                    <p className="text-sm text-gray-600">Profile Analysis</p>
                  </div>
                </div>
                <div className="space-y-3 text-gray-700">
                  <p className="text-sm leading-relaxed">
                    Analyze LinkedIn profiles and company pages to extract contextual insights and buying signals in real-time.
                  </p>
                  <p className="text-sm leading-relaxed">
                    Get personalized outreach recommendations based on profile data, job changes, and company updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Gmail */}
            <div 
              className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCardMousePositions(prev => ({
                  ...prev,
                  gmail: {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  }
                }));
              }}
              onMouseLeave={() => {
                setCardMousePositions(prev => ({
                  ...prev,
                  gmail: { x: 0, y: 0 }
                }));
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute h-32 w-32 rounded-full bg-gradient-to-b from-[#F95B14]/20 via-[#F95B14]/10 to-transparent blur-xl transition-all duration-500 ease-out pointer-events-none"
                style={{
                  left: `${cardMousePositions.gmail?.x || 0}px`,
                  top: `${cardMousePositions.gmail?.y || 0}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <Image 
                    src="/Gmail Icon.svg" 
                    alt="Gmail" 
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-black">Gmail</h3>
                    <p className="text-sm text-gray-600">Email Automation</p>
                  </div>
                </div>
                <div className="space-y-3 text-gray-700">
                  <p className="text-sm leading-relaxed">
                    Auto-draft personalized replies and follow-ups based on your sent email history and writing style.
                  </p>
                  <p className="text-sm leading-relaxed">
                    Schedule meetings automatically and organize your inbox with AI-powered categorization and prioritization.
                  </p>
                </div>
              </div>
            </div>

            {/* Outlook */}
            <div 
              className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCardMousePositions(prev => ({
                  ...prev,
                  outlook: {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  }
                }));
              }}
              onMouseLeave={() => {
                setCardMousePositions(prev => ({
                  ...prev,
                  outlook: { x: 0, y: 0 }
                }));
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute h-32 w-32 rounded-full bg-gradient-to-b from-[#F95B14]/20 via-[#F95B14]/10 to-transparent blur-xl transition-all duration-500 ease-out pointer-events-none"
                style={{
                  left: `${cardMousePositions.outlook?.x || 0}px`,
                  top: `${cardMousePositions.outlook?.y || 0}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <Image 
                    src="/Outlook_icon.svg" 
                    alt="Outlook" 
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-black">Outlook</h3>
                    <p className="text-sm text-gray-600">Microsoft 365</p>
                  </div>
                </div>
                <div className="space-y-3 text-gray-700">
                  <p className="text-sm leading-relaxed">
                    Seamless Microsoft 365 integration with calendar sync, team collaboration, and enterprise-grade security.
                  </p>
                  <p className="text-sm leading-relaxed">
                    AI-powered email drafting and meeting scheduling with full Office 365 ecosystem compatibility.
                  </p>
                </div>
              </div>
            </div>

            {/* HubSpot */}
            <div 
              className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCardMousePositions(prev => ({
                  ...prev,
                  hubspot: {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  }
                }));
              }}
              onMouseLeave={() => {
                setCardMousePositions(prev => ({
                  ...prev,
                  hubspot: { x: 0, y: 0 }
                }));
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute h-32 w-32 rounded-full bg-gradient-to-b from-[#F95B14]/20 via-[#F95B14]/10 to-transparent blur-xl transition-all duration-500 ease-out pointer-events-none"
                style={{
                  left: `${cardMousePositions.hubspot?.x || 0}px`,
                  top: `${cardMousePositions.hubspot?.y || 0}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <Image 
                    src="/hubspot-1.svg" 
                    alt="HubSpot" 
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-black">HubSpot</h3>
                    <p className="text-sm text-gray-600">CRM & Marketing</p>
                  </div>
                </div>
                <div className="space-y-3 text-gray-700">
                  <p className="text-sm leading-relaxed">
                    Sync contacts, deals, and activities automatically with AI-enriched lead scoring and pipeline insights.
                  </p>
                  <p className="text-sm leading-relaxed">
                    Generate personalized content and automate marketing sequences based on prospect behavior and engagement.
                  </p>
                </div>
              </div>
            </div>

            {/* Google Calendar */}
            <div 
              className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setCardMousePositions(prev => ({
                  ...prev,
                  googlecal: {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  }
                }));
              }}
              onMouseLeave={() => {
                setCardMousePositions(prev => ({
                  ...prev,
                  googlecal: { x: 0, y: 0 }
                }));
              }}
            >
              {/* Gradient overlay */}
              <div 
                className="absolute h-32 w-32 rounded-full bg-gradient-to-b from-[#F95B14]/20 via-[#F95B14]/10 to-transparent blur-xl transition-all duration-500 ease-out pointer-events-none"
                style={{
                  left: `${cardMousePositions.googlecal?.x || 0}px`,
                  top: `${cardMousePositions.googlecal?.y || 0}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <Image 
                    src="/Google_Calendar_logo.svg" 
                    alt="Google Calendar" 
                    width={40}
                    height={40}
                    className="w-10 h-10"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-black">Google Calendar</h3>
                    <p className="text-sm text-gray-600">Smart Scheduling</p>
                  </div>
                </div>
                <div className="space-y-3 text-gray-700">
                  <p className="text-sm leading-relaxed">
                    AI-powered meeting scheduling that analyzes availability patterns and optimizes for prospect time zones.
                  </p>
                  <p className="text-sm leading-relaxed">
                    Automatic calendar event creation with smart reminders and follow-up task generation based on meeting outcomes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features: Why Curiosity Engine Wins */}
        <section className="relative mx-auto max-w-7xl px-6 py-24 bg-white">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full bg-[#F95B14]/10 px-4 py-1.5 text-sm font-medium text-[#F95B14] ring-1 ring-inset ring-[#F95B14]/20 mb-6 relative z-10">
              ⚡ Intelligent Automation
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6 leading-tight">
              Why top performers choose Curiosity Engine
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Built for sales professionals who need more than templates. Get AI that truly understands your deals, your process, and your prospects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold text-black mb-4">Pipeline Intelligence</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Know exactly where every deal stands and what to do next. Our AI tracks deal stages, identifies at-risk opportunities, and suggests the perfect timing for follow-ups.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Automatic deal stage detection and progression tracking</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Smart follow-up timing based on prospect engagement</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Priority prospect identification for maximum ROI</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold text-black mb-4">Deep Personalization</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Every message matches your company's positioning and the prospect's needs. No more generic templates—get emails that sound like you wrote them yourself.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Industry-specific positioning and value props</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Automatic case study and social proof matching</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Pain point identification from prospect research</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold text-black mb-4">Your Sales Process, Amplified</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Use MEDDIC, Challenger, SPIN, or your own framework. Our AI adapts to your proven methodology and helps you execute it flawlessly every time.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Framework-aligned discovery questions</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Automatic qualification criteria checking</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Best practice recommendations for each deal stage</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-2xl font-bold text-black mb-4">Works While You Sleep</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                From drafting personalized emails to updating your CRM to scheduling the perfect meeting time—your AI assistant handles the busywork 24/7.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Seamless CRM updates and activity logging</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Intelligent meeting scheduling across time zones</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#F95B14] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Proactive reminders when deals need attention</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-b from-[#F95B14]/10 via-white to-white p-12 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-6 leading-tight">
                Transform Your Sales Game Today
              </h2>
              <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
                Join 10,000+ sales professionals who've eliminated busywork and doubled their productivity with AI-powered automation.
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
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-gray-100 text-black font-semibold rounded-lg border border-gray-200 transition-all hover:bg-gray-200 text-lg"
                >
                  <Image 
                    src="/chrome_icon.svg" 
                    alt="Chrome" 
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  Download Chrome Extension
                </Link>
              </div>
              <p className="mt-6 text-sm text-gray-600">
                No credit card required • 7-day free trial • Cancel anytime
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-gray-50 mt-24">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Logo and Description */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <Image 
                    src="/icononly_transparent_nobuffer.png" 
                    alt="Sales Curiosity Icon" 
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                  <span className="text-xl font-bold text-gray-900">Curiosity Engine</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  The AI Sales Assistant that transforms your productivity with intelligent automation across Salesforce, LinkedIn, and email.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Get Started</h3>
                <ul className="modern-icon-buttons">
                  <li 
                    style={{'--i': '#4285F4', '--j': '#EA4335'} as React.CSSProperties}
                  >
                    <span className="icon">
                      <svg width="28" height="28" viewBox="0 0 48 48" fill="currentColor">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </span>
                    <span className="title">Google</span>
                  </li>
                  <li 
                    style={{'--i': '#0078D4', '--j': '#106EBE'} as React.CSSProperties}
                  >
                    <span className="icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                      </svg>
                    </span>
                    <span className="title">Microsoft</span>
                  </li>
                </ul>
              </div>

              {/* Links */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Resources</h3>
                <div className="flex flex-col gap-4">
                  <Link href="/privacy" className="text-gray-600 hover:text-[#F95B14] transition text-sm">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="text-gray-600 hover:text-[#F95B14] transition text-sm">
                    Terms of Service
                  </Link>
                  <Link href="/install" className="text-gray-600 hover:text-[#F95B14] transition text-sm">
                    Download Extension
                  </Link>
                  <Link href="/support" className="text-gray-600 hover:text-[#F95B14] transition text-sm">
                    Support
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Bottom Bar */}
            <div className="border-t border-gray-200 mt-12 pt-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-gray-500 text-sm">
                  © 2025 Curiosity Engine. All rights reserved.
                </div>
                <div className="flex gap-6">
                  <Link href="/blog" className="text-gray-500 hover:text-[#F95B14] transition text-sm">
                    Blog
                  </Link>
                  <Link href="/contact" className="text-gray-500 hover:text-[#F95B14] transition text-sm">
                    Contact
                  </Link>
                </div>
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
                <div className="p-4 sm:p-6 text-gray-300 text-xs sm:text-sm leading-relaxed max-h-96 overflow-y-auto">
                  {(() => {
                    // Strip thinking tags from analysis before displaying
                    let cleanedAnalysis = result.analysis
                      .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove complete thinking tags
                      .replace(/<think>.*$/g, '') // Remove incomplete thinking tags
                      .trim();
                    
                    // Split and format with better structure
                    return cleanedAnalysis.split('\n').map((line: string, i: number) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) return <br key={i} />;
                      
                      // Headers with markdown
                      if (trimmedLine.startsWith('###')) {
                        return <div key={i} className="text-[#F95B14] font-bold text-base mt-4 mb-2">{trimmedLine.replace(/^###\s*/, '')}</div>;
                      }
                      if (trimmedLine.startsWith('##')) {
                        return <div key={i} className="text-[#F95B14] font-bold text-sm mt-3 mb-2">{trimmedLine.replace(/^##\s*/, '')}</div>;
                      }
                      
                      // Bold sections with **
                      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                        return <div key={i} className="text-white font-semibold mt-3 mb-1">{trimmedLine.replace(/\*\*/g, '')}</div>;
                      }
                      
                      // Bullet points
                      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
                        return <div key={i} className="text-gray-300 ml-4 mt-1">• {trimmedLine.replace(/^[-•]\s*/, '')}</div>;
                      }
                      
                      // Emoji section headers
                      if (/^[🎯📧💡🔍✨📊⚡️🔗➕]/.test(trimmedLine)) {
                        return <div key={i} className="text-white font-semibold mt-3 mb-1">{trimmedLine}</div>;
                      }
                      
                      // Regular text with inline bold support
                      if (trimmedLine.includes('**')) {
                        const parts = trimmedLine.split('**');
                        return (
                          <div key={i} className="text-gray-300 mt-1">
                            {parts.map((part, idx) => 
                              idx % 2 === 1 ? 
                                <strong key={idx} className="text-white font-semibold">{part}</strong> : 
                                <span key={idx}>{part}</span>
                            )}
                          </div>
                        );
                      }
                      
                      return <div key={i} className="text-gray-300 mt-1">{trimmedLine}</div>;
                    });
                  })()}
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

