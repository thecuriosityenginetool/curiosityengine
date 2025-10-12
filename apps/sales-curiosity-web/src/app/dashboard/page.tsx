'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
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
  user_id: string;
  organization_id?: string;
  linkedin_url: string;
  profile_name?: string;
  profile_headline?: string;
  profile_data?: any;
  ai_analysis?: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'context' | 'integrations' | 'logs'>('dashboard');
  
  // Dashboard state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventMenu, setShowEventMenu] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  
  // Connector card mouse positions
  const [cardMousePositions, setCardMousePositions] = useState<{
    [key: string]: { x: number; y: number };
  }>({});
  
  // Chrome extension detection
  const [hasChromeExtension, setHasChromeExtension] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated' && session?.user) {
      checkAuth();
    }
  }, [status, session]);

  useEffect(() => {
    if (activeTab === 'dashboard' && user) {
      loadCalendarEvents();
    } else if (activeTab === 'leads' && user) {
      loadLeads();
    } else if (activeTab === 'integrations' && user) {
      checkChromeExtension();
    }
  }, [activeTab, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function checkAuth() {
    try {
      if (!session?.user?.email) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      
      // Fetch user data from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (userData) {
        setUserData(userData);
      } else {
        // User doesn't exist in database yet, show basic info
        setUserData({
          id: session.user.id || '',
          email: session.user.email,
          full_name: session.user.name || session.user.email?.split('@')[0] || 'User',
          role: 'member',
          user_context: { aboutMe: '', objectives: '' }
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in checkAuth:', error);
      setLoading(false);
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
      console.log('Loading leads for user:', user.id);
      
      const { data, error } = await supabase
        .from('linkedin_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading leads:', error);
        return;
      }

      console.log('Loaded leads:', data?.length || 0, 'leads');
      if (data) {
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

    const messageContent = chatInput;
    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setIsSendingMessage(true);

    try {
      // Create chat if this is the first message
      if (!currentChatId) {
        const chatResponse = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : ''),
            initialMessage: messageContent
          }),
        });

        if (chatResponse.ok) {
          const { chat } = await chatResponse.json();
          setCurrentChatId(chat.id);
        }
      } else {
        // Save user message to existing chat
        await fetch(`/api/chats/${currentChatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'user',
            content: messageContent
          }),
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
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
        
        // Save assistant message
        if (currentChatId) {
          await fetch(`/api/chats/${currentChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'assistant',
              content: data.response
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function checkChromeExtension() {
    try {
      // Check if the Chrome extension is installed
      const extensionId = 'your-extension-id'; // Replace with actual extension ID
      
      // Try to communicate with the extension
      const response = await fetch(`chrome-extension://${extensionId}/manifest.json`);
      setHasChromeExtension(response.ok);
    } catch (error) {
      // Fallback: check if extension object exists in window
      if (typeof window !== 'undefined' && (window as any).curiosityEngineExtension) {
        setHasChromeExtension(true);
      } else {
        setHasChromeExtension(false);
      }
    }
  }

  async function connectToSalesforce() {
    // TODO: Implement Salesforce OAuth flow
    alert('Salesforce integration coming soon!');
  }

  async function connectToGmail() {
    // TODO: Implement Gmail OAuth flow
    alert('Gmail integration coming soon!');
  }

  async function connectToOutlook() {
    // TODO: Implement Outlook OAuth flow
    alert('Outlook integration coming soon!');
  }

  async function connectToHubSpot() {
    // TODO: Implement HubSpot OAuth flow
    alert('HubSpot integration coming soon!');
  }

  async function connectToGoogleCalendar() {
    // TODO: Implement Google Calendar OAuth flow
    alert('Google Calendar integration coming soon!');
  }

  async function installChromeExtension() {
    // Redirect to Chrome Web Store
    window.open('https://chrome.google.com/webstore/detail/curiosity-engine/your-extension-id', '_blank');
  }

  async function handleCalendarEventClick(event: CalendarEvent) {
    try {
      setIsSendingMessage(true);
      
      // Generate message based on calendar event
      const prompt = `Generate a professional follow-up email for this upcoming meeting:
Title: ${event.title}
Date: ${new Date(event.start).toLocaleDateString()} at ${new Date(event.start).toLocaleTimeString()}
Description: ${event.description || 'No description provided'}
Attendees: ${event.attendees?.join(', ') || 'No attendees listed'}

Please include:
1. A friendly greeting
2. Confirmation of the meeting details
3. A brief agenda or talking points
4. An offer to share any preparatory materials
5. A professional closing

Keep it concise and actionable.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          conversationHistory: [],
          userContext: userData?.user_context,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create Outlook draft
        const draftResponse = await fetch('/api/email/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: event.attendees || [],
            subject: `RE: ${event.title}`,
            body: data.response,
            provider: 'microsoft' // Force Outlook
          }),
        });

        if (draftResponse.ok) {
          alert(`✅ Draft created in Outlook for: ${event.title}`);
        } else {
          // Show the generated message in chat if draft creation fails
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: `I've generated a message for "${event.title}":\n\n${data.response}\n\n(Note: Could not create Outlook draft. Please connect your Outlook account in Settings.)`,
            timestamp: new Date().toISOString()
          };
          setChatMessages([...chatMessages, assistantMessage]);
        }
      }
    } catch (error) {
      console.error('Error handling calendar event:', error);
      alert('Error generating message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleLogout() {
    await signOut({ callbackUrl: '/' });
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
              { id: 'integrations', label: '🔌 Connectors', icon: '🔌' },
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
                    <div 
                      key={event.id} 
                      className="border border-gray-200 rounded-lg p-3 hover:border-[#F95B14] hover:bg-orange-50 transition-all cursor-pointer group"
                      onClick={() => handleCalendarEventClick(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 text-sm">{event.title}</h3>
                            <span className="text-xs text-gray-400 group-hover:text-[#F95B14] transition-colors">
                              ✉️ Draft
                            </span>
                          </div>
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
                      <h3 className="font-medium text-gray-900">{lead.profile_name || 'Unknown Profile'}</h3>
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
                      <h2 className="text-2xl font-bold text-gray-900">{selectedLead.profile_name || 'Unknown Profile'}</h2>
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
                        dangerouslySetInnerHTML={{ __html: selectedLead.ai_analysis || 'No analysis available yet' }}
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
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">🔌 Connectors</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Connect with the tools you already use. Our AI agents understand your pipeline, company context, and sales process.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Salesforce */}
              <div 
                className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden hover:shadow-lg transition-shadow"
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
                  <div className="mt-6 flex items-center justify-between">
                    <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                      Coming Soon
                    </span>
                    <button
                      onClick={connectToSalesforce}
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>

              {/* LinkedIn */}
              <div 
                className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden hover:shadow-lg transition-shadow"
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
                  <div className="mt-6 flex items-center justify-between">
                    {hasChromeExtension === true ? (
                      <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Chrome Extension Installed
                      </span>
                    ) : hasChromeExtension === false ? (
                      <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        Chrome Extension Not Found
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        Checking...
                      </span>
                    )}
                    {hasChromeExtension === false ? (
                      <button
                        onClick={installChromeExtension}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#F95B14] rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Install Extension
                      </button>
                    ) : hasChromeExtension === true ? (
                      <button
                        disabled
                        className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                      >
                        Connected
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                      >
                        Checking...
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Gmail */}
              <div 
                className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden hover:shadow-lg transition-shadow"
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
                  <div className="mt-6 flex items-center justify-between">
                    <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                      Coming Soon
                    </span>
                    <button
                      onClick={connectToGmail}
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>

              {/* Outlook */}
              <div 
                className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden hover:shadow-lg transition-shadow"
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
                  <div className="mt-6 flex items-center justify-between">
                    <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                      Coming Soon
                    </span>
                    <button
                      onClick={connectToOutlook}
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>

              {/* HubSpot */}
              <div 
                className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden hover:shadow-lg transition-shadow"
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
                  <div className="mt-6 flex items-center justify-between">
                    <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                      Coming Soon
                    </span>
                    <button
                      onClick={connectToHubSpot}
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>

              {/* Google Calendar */}
              <div 
                className="rounded-2xl border border-gray-200 bg-white p-8 relative overflow-hidden hover:shadow-lg transition-shadow"
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
                  <div className="mt-6 flex items-center justify-between">
                    <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                      Coming Soon
                    </span>
                    <button
                      onClick={connectToGoogleCalendar}
                      disabled
                      className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                    >
                      Connect
                    </button>
                  </div>
                </div>
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

