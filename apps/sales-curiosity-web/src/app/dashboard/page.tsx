'use client';

import { useEffect, useState, useRef } from 'react';
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

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  type?: string;
  attendees?: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Lead {
  id: string;
  profile_name: string;
  linkedin_url: string;
  analysis: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'context' | 'integrations'>('dashboard');
  
  // Dashboard state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard' && user) {
      loadCalendarEvents();
    } else if (activeTab === 'leads' && user) {
      loadLeads();
    }
  }, [activeTab, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userError) {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email || 'user@example.com',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            role: 'member'
          })
          .select()
          .single();

        setUserData(newUser || {
          id: session.user.id,
          email: session.user.email || 'user@example.com',
          full_name: session.user.user_metadata?.full_name || 'User',
          role: 'member',
          user_context: { aboutMe: '', objectives: '' }
        });
      } else {
        setUserData(userData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in checkAuth:', error);
      router.push('/login');
    }
  }

  async function loadCalendarEvents() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/calendar', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
  }

  async function loadLeads() {
    try {
      const { data, error } = await supabase
        .from('linkedin_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLeads(data);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || isSendingMessage) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setIsSendingMessage(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatInput,
          conversationHistory: chatMessages,
          userContext: userData?.user_context,
          calendarEvents
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        setChatMessages([...chatMessages, userMessage, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSendingMessage(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Image
                src="/icononly_transparent_nobuffer.png"
                alt="Curiosity Engine"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Curiosity Engine</h1>
                <p className="text-sm text-gray-600">AI Sales Assistant</p>
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
              { id: 'leads', label: '👥 Leads', icon: '👥' },
              { id: 'context', label: '⚙️ Settings', icon: '⚙️' },
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
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Chat - Takes up 2 columns */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-[700px] flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                  <p className="text-sm text-gray-600">Ask me anything about your calendar, leads, or sales tasks</p>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                      <div className="text-4xl mb-4">💬</div>
                      <p className="text-lg font-medium">Start a conversation</p>
                      <p className="text-sm mt-2">Ask me to draft emails, schedule meetings, or analyze your leads</p>
                    </div>
                  )}

                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user' 
                          ? 'bg-[#F95B14] text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isSendingMessage && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
                      disabled={isSendingMessage}
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || isSendingMessage}
                      className="bg-[#F95B14] text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar - Takes up 1 column */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">📅 Upcoming Events</h2>
                </div>

                <div className="p-4 space-y-3 max-h-[640px] overflow-y-auto">
                  {calendarEvents.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-3xl mb-2">📅</div>
                      <p className="text-sm">No upcoming events</p>
                      <p className="text-xs mt-1">Connect your calendar to see events</p>
                    </div>
                  )}

                  {calendarEvents.map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-3 hover:border-[#F95B14] transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-sm">{event.title}</h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {new Date(event.start).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.type === 'meeting' ? 'bg-blue-100 text-blue-800' :
                          event.type === 'demo' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {event.type || 'event'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leads List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Your Leads</h2>
                  <p className="text-sm text-gray-600 mt-1">From Chrome Extension</p>
                </div>

                <div className="divide-y divide-gray-200 max-h-[700px] overflow-y-auto">
                  {leads.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <div className="text-4xl mb-2">👥</div>
                      <p className="text-sm">No leads yet</p>
                      <p className="text-xs mt-1">Use the Chrome extension to analyze LinkedIn profiles</p>
                    </div>
                  )}

                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedLead?.id === lead.id ? 'bg-orange-50 border-l-4 border-[#F95B14]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <h3 className="font-medium text-gray-900">{lead.profile_name}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lead Details */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {selectedLead ? (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedLead.profile_name}</h2>
                      <a 
                        href={selectedLead.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View LinkedIn Profile →
                      </a>
                    </div>

                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h3>
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedLead.analysis }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-20 text-center text-gray-500">
                    <div className="text-5xl mb-4">👈</div>
                    <p className="text-lg">Select a lead to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'context' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Context</h2>
              <p className="text-gray-600 mb-6">
                This information helps the AI provide personalized assistance.
              </p>
              
              <ContextForm 
                context={userData.user_context || { aboutMe: '', objectives: '' }}
                onSave={async (context) => {
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
                    alert('Context saved successfully!');
                    if (userData) {
                      setUserData({ ...userData, user_context: context });
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrations</h2>
              <p className="text-gray-600 mb-6">
                Connect your tools to streamline your workflow.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <IntegrationCard 
                  icon="📧"
                  title="Email Integration"
                  description="Gmail, Outlook, and more"
                  status="coming-soon"
                />
                <IntegrationCard 
                  icon="📅"
                  title="Calendar Sync"
                  description="Google Calendar, Outlook Calendar"
                  status="coming-soon"
                />
                <IntegrationCard 
                  icon="🔗"
                  title="CRM Integration"
                  description="Salesforce, HubSpot, and more"
                  status="coming-soon"
                />
                <IntegrationCard 
                  icon="💼"
                  title="LinkedIn"
                  description="Chrome Extension installed"
                  status="active"
                />
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
        onClick={() => onSave({ aboutMe, objectives })}
        className="bg-[#F95B14] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
      >
        Save Context
      </button>
    </div>
  );
}

function IntegrationCard({ icon, title, description, status }: {
  icon: string;
  title: string;
  description: string;
  status: 'active' | 'coming-soon';
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:border-[#F95B14] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{icon}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs rounded-full ${
          status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {status === 'active' ? 'Active' : 'Coming Soon'}
        </span>
      </div>
      <button
        disabled={status === 'coming-soon'}
        className={`w-full py-2 rounded-lg font-medium transition-colors ${
          status === 'active'
            ? 'bg-[#F95B14] text-white hover:bg-orange-600'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {status === 'active' ? 'Configure' : 'Coming Soon'}
      </button>
    </div>
  );
}
