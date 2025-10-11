'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'member' | 'org_admin' | 'super_admin';
  organization_id?: string;
  user_context?: {
    aboutMe: string;
    objectives: string;
  };
}

interface UserStats {
  analysesCount: number;
  emailsCount: number;
  recentAnalyses: Array<{
    id: string;
    profile_name: string;
    created_at: string;
  }>;
}

interface TeamStats {
  totalAnalyses: number;
  totalEmails: number;
  activeMembers: number;
}

interface Organization {
  name: string;
  account_type: 'individual' | 'organization';
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'context' | 'integrations'>('home');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [emailContext, setEmailContext] = useState('');
  const [selectedAction, setSelectedAction] = useState<'analyze' | 'email'>('analyze');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
      return;
    }
    
      setUser(session.user);
      
      // Get user data from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        // If user doesn't exist in users table, create them
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || '',
            role: 'member'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
        } else {
          setUserData(newUser);
        }
      } else {
        setUserData(userData);
      }

      await loadUserStats(session.user.id);
      setLoading(false);
    } catch (error) {
      console.error('Error in checkAuth:', error);
      router.push('/login');
    }
  }

  async function loadUserStats(userId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data.userStats);
        setTeamStats(data.teamStats);
        setOrganization(data.organization);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  async function loadUserContext() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/user/context', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (userData) {
          setUserData({ ...userData, user_context: data.userContext });
        }
      }
    } catch (error) {
      console.error('Error loading user context:', error);
    }
  }

  async function saveUserContext(context: { aboutMe: string; objectives: string }) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/user/context', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userContext: context }),
      });

      if (response.ok) {
        await loadUserContext();
        alert('Context saved successfully!');
      }
    } catch (error) {
      console.error('Error saving user context:', error);
      alert('Failed to save context');
    }
  }

  async function analyzeProfile() {
    if (!linkedinUrl.trim()) {
      alert('Please enter a LinkedIn URL');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkedinUrl: linkedinUrl.trim(),
          action: selectedAction,
          userContext: userData?.user_context,
          emailContext: emailContext.trim() || undefined,
          profileData: { url: linkedinUrl.trim() } // Placeholder - would be scraped
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.analysis || data.email);
        await loadUserStats(session.user.id); // Refresh stats
    } else {
        alert('Failed to analyze profile');
      }
    } catch (error) {
      console.error('Error analyzing profile:', error);
      alert('Error analyzing profile');
    } finally {
      setProcessing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

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

  if (!user || !userData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Authentication required</div>
          <div className="text-gray-600">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  const isAdmin = userData.role === 'org_admin' || userData.role === 'super_admin';
  const isOrgMember = organization?.account_type === 'organization';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Image
                  src="/icononly_transparent_nobuffer.png"
                  alt="Curiosity Engine"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Sales Curiosity</h1>
                  <p className="text-sm text-gray-600">
                    {isOrgMember ? 'Organization Workspace' : 'Personal Workspace'}
                  </p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isOrgMember 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-cyan-100 text-cyan-800'
              }`}>
                {isOrgMember ? '🏢 Organization' : '👤 Personal'}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {[
              { id: 'home', label: '🏠 Home', icon: '🏠' },
              { id: 'context', label: '👤 Context', icon: '👤' },
              { id: 'integrations', label: '🔌 Integrations', icon: '🔌' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#F95B14] text-[#F95B14]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Stats Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Your Activity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#F95B14]">{userStats?.analysesCount || 0}</div>
                  <div className="text-sm text-gray-600">Profiles Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#F95B14]">{userStats?.emailsCount || 0}</div>
                  <div className="text-sm text-gray-600">Emails Drafted</div>
                </div>
                {teamStats && (
                  <>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#F95B14]">{teamStats.totalAnalyses}</div>
                      <div className="text-sm text-gray-600">Team Analyses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#F95B14]">{teamStats.activeMembers}</div>
                      <div className="text-sm text-gray-600">Team Members</div>
                    </div>
                  </>
                )}
              </div>
              
              {userStats?.recentAnalyses && userStats.recentAnalyses.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Analyses</h3>
                  <div className="space-y-2">
                    {userStats.recentAnalyses.map((analysis) => (
                      <div key={analysis.id} className="text-sm text-gray-600">
                        • {analysis.profile_name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* LinkedIn Analysis */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">LinkedIn Profile Analysis</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/profile-name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setSelectedAction('analyze')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedAction === 'analyze'
                        ? 'bg-[#F95B14] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🔍 Analyze Profile
                  </button>
                  <button
                    onClick={() => setSelectedAction('email')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedAction === 'email'
                        ? 'bg-[#F95B14] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✉️ Draft Email
                  </button>
                </div>

                {selectedAction === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Context (Optional)
                    </label>
                    <textarea
                      value={emailContext}
                      onChange={(e) => setEmailContext(e.target.value)}
                      placeholder="Add any specific context for the email..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={analyzeProfile}
                  disabled={processing || !linkedinUrl.trim()}
                  className="w-full bg-[#F95B14] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : (selectedAction === 'analyze' ? 'Analyze Profile' : 'Generate Email')}
                </button>
              </div>

              {result && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedAction === 'analyze' ? 'Analysis Result' : 'Generated Email'}
                  </h3>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{result}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'context' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Context</h2>
            <p className="text-gray-600 mb-6">
              This information will be used to personalize AI-generated analyses and emails.
            </p>
            
            <ContextForm 
              context={userData.user_context || { aboutMe: '', objectives: '' }}
              onSave={saveUserContext}
            />
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Connect your tools to streamline your workflow.
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📧</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Email Integration</h3>
                      <p className="text-sm text-gray-600">Gmail, Outlook, and more</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Send drafted emails directly to your email client
                </p>
                <button
                  disabled
                  className="w-full bg-gray-100 text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                >
                  Connect Email
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🔗</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">CRM Integration</h3>
                      <p className="text-sm text-gray-600">Salesforce, HubSpot, and more</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Automatically sync profiles and activities to your CRM
                </p>
                <button
                  disabled
                  className="w-full bg-gray-100 text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                >
                  Connect CRM
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContextForm({ context, onSave }: { 
  context: { aboutMe: string; objectives: string }; 
  onSave: (context: { aboutMe: string; objectives: string }) => void;
}) {
  const [aboutMe, setAboutMe] = useState(context.aboutMe);
  const [objectives, setObjectives] = useState(context.objectives);

  const handleSave = () => {
    onSave({ aboutMe, objectives });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          About Me
        </label>
        <textarea
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="Describe your role, company, and what you do..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          My Objectives
        </label>
        <textarea
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          placeholder="What are your sales goals and objectives?"
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
        />
      </div>

      <button
        onClick={handleSave}
        className="bg-[#F95B14] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
      >
        Save Context
      </button>
    </div>
  );
}

