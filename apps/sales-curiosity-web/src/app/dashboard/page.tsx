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
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventMenu, setShowEventMenu] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  
  // Settings state
  const [profileData, setProfileData] = useState({
    full_name: '',
    job_title: '',
    company_name: '',
    company_url: ''
  });
  const [salesMaterials, setSalesMaterials] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Connection modal state
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionService, setConnectionService] = useState<'outlook' | 'salesforce' | null>(null);
  const [hasOutlookConnection, setHasOutlookConnection] = useState(false);
  const [hasSalesforceConnection, setHasSalesforceConnection] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  
  // Chrome extension detection
  const [hasChromeExtension, setHasChromeExtension] = useState<boolean | null>(null);
  
  // Card mouse positions for animations
  const [cardMousePositions, setCardMousePositions] = useState<{[key: string]: {x: number, y: number}}>({});

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
    if (user) {
      checkConnections(); // Check connections on mount
    }
    
    if (activeTab === 'dashboard' && user) {
      loadCalendarEvents();
      loadChatHistory();
    } else if (activeTab === 'leads' && user) {
      loadLeads();
    } else if (activeTab === 'integrations' && user) {
      checkChromeExtension();
    } else if (activeTab === 'logs' && user) {
      loadActivityLogs();
    } else if (activeTab === 'context' && user) {
      loadProfileData();
      loadSalesMaterials();
    }
  }, [activeTab, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Close event menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showEventMenu) {
        setShowEventMenu(false);
      }
    };
    
    if (showEventMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEventMenu]);

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
      const response = await fetch('/api/calendar');

      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.events || []);
        console.log('📅 Calendar events loaded:', data.events?.length || 0);
      } else {
        console.error('❌ Calendar API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
  }

  async function syncCalendar() {
    setIsSyncingCalendar(true);
    try {
      await loadCalendarEvents();
      // Show success message briefly
      setTimeout(() => {
        setIsSyncingCalendar(false);
      }, 1000);
    } catch (error) {
      console.error('Error syncing calendar:', error);
      setIsSyncingCalendar(false);
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

  async function loadChatHistory() {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.chats || []);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  async function loadActivityLogs() {
    try {
      const response = await fetch('/api/activity-logs');
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
    }
  }

  async function createActivityLog(actionType: string, title: string, description?: string, metadata?: any) {
    try {
      console.log('📝 Creating activity log:', { actionType, title, description });
      const response = await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType,
          action_title: title,
          action_description: description,
          metadata: metadata || {}
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Activity log creation failed:', {
          status: response.status,
          error: errorData
        });
        throw new Error(`Activity log failed: ${errorData.error || response.statusText}`);
      }
      
      console.log('✅ Activity log created successfully');
      if (activeTab === 'logs') {
        loadActivityLogs();
      }
    } catch (error) {
      console.error('❌ Error creating activity log:', error);
    }
  }

  function startNewChat() {
    setChatMessages([]);
    setCurrentChatId(null);
    setShowChatSidebar(false);
  }

  async function loadChat(chatId: string) {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json();
        const messages = data.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at
        }));
        setChatMessages(messages);
        setCurrentChatId(chatId);
        setShowChatSidebar(false);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
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

    // Create a placeholder for the assistant's response
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    setChatMessages([...chatMessages, userMessage, assistantMessage]);

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
          
          // Auto-generate chat title based on first message
          fetch(`/api/chats/${chat.id}/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstMessage: messageContent }),
          }).then(() => loadChatHistory()); // Reload to show new title
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

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          conversationHistory: chatMessages,
          userContext: userData?.user_context,
          calendarEvents
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'content') {
                  accumulatedContent += parsed.content;
                  // Update the assistant message in real-time
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: accumulatedContent
                    };
                    return newMessages;
                  });
                } else if (parsed.type === 'tool_start') {
                  // Show tool indicator
                  const toolIcon = parsed.tool === 'search_salesforce' ? '🔍' :
                    parsed.tool === 'create_lead' || parsed.tool === 'create_contact' ? '✏️' :
                    parsed.tool === 'update_record' ? '📝' :
                    parsed.tool === 'create_task' ? '✅' :
                    parsed.tool === 'get_activity' ? '📊' :
                    parsed.tool === 'add_note' ? '📌' : '⚙️';
                  
                  accumulatedContent += `\n\n${toolIcon} Executing ${parsed.tool.replace(/_/g, ' ')}...`;
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: accumulatedContent
                    };
                    return newMessages;
                  });
                } else if (parsed.type === 'tool_result') {
                  // Remove the "Executing..." text and let AI respond naturally
                  const lines = accumulatedContent.split('\n');
                  const filtered = lines.filter(l => !l.includes('Executing'));
                  accumulatedContent = filtered.join('\n');
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: accumulatedContent
                    };
                    return newMessages;
                  });
                } else if (parsed.type === 'done') {
                  // Save final assistant message
                  if (currentChatId && accumulatedContent) {
                    await fetch(`/api/chats/${currentChatId}/messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        role: 'assistant',
                        content: accumulatedContent
                      }),
                    });
                  }
                } else if (parsed.type === 'error') {
                  accumulatedContent += `\n\n❌ Error: ${parsed.error}`;
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: accumulatedContent
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Update the assistant message with error
      setChatMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1]?.role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: `❌ Sorry, there was an error processing your message. Please try again.`
          };
        }
        return newMessages;
      });
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function checkChromeExtension() {
    try {
      // Check if extension is installed by looking for injected script
      if (typeof window !== 'undefined') {
        // Extension injects a global variable
        setHasChromeExtension(!!(window as any).salesCuriosityExtension);
      } else {
        setHasChromeExtension(false);
      }
    } catch (error) {
      setHasChromeExtension(false);
    }
  }

  async function connectToSalesforce() {
    connectSalesforce(); // Use the function we created
  }

  async function connectToGmail() {
    // Gmail uses Google OAuth - similar to Outlook
    alert('Gmail integration coming soon!');
  }

  async function connectToOutlook() {
    console.log('🔴 connectToOutlook called!');
    try {
      console.log('🔴 Calling connectOutlook()...');
      await connectOutlook(); // Use the function we created
      console.log('🔴 connectOutlook() completed');
    } catch (error) {
      console.error('🔴 Error in connectToOutlook:', error);
      alert(`Error connecting to Outlook: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function disconnectSalesforce() {
    try {
      const response = await fetch('/api/salesforce/disconnect', {
        method: 'POST',
      });
      if (response.ok) {
        setHasSalesforceConnection(false);
        alert('✅ Salesforce disconnected successfully');
        await createActivityLog('salesforce_disconnected', 'Salesforce Disconnected', 'Salesforce integration disconnected');
      } else {
        alert('❌ Failed to disconnect Salesforce');
      }
    } catch (error) {
      console.error('Error disconnecting Salesforce:', error);
      alert('❌ Error disconnecting Salesforce');
    }
  }

  async function disconnectOutlook() {
    try {
      const response = await fetch('/api/outlook/disconnect', {
        method: 'POST',
      });
      if (response.ok) {
        setHasOutlookConnection(false);
        alert('✅ Outlook disconnected successfully');
        await createActivityLog('outlook_disconnected', 'Outlook Disconnected', 'Outlook integration disconnected');
      } else {
        alert('❌ Failed to disconnect Outlook');
      }
    } catch (error) {
      console.error('Error disconnecting Outlook:', error);
      alert('❌ Error disconnecting Outlook');
    }
  }

  async function connectToHubSpot() {
    try {
      const response = await fetch('/api/hubspot/auth-user');
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting HubSpot:', error);
    }
  }

  async function connectToGoogleCalendar() {
    alert('Google Calendar integration coming soon!');
  }

  async function installChromeExtension() {
    // Link to your published extension or download page
    window.open('https://www.curiosityengine.io/install', '_blank');
  }

  function handleCalendarEventClick(event: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedEvent(event);
    setShowEventMenu(true);
  }

  async function handleMeetingInsights(event: CalendarEvent) {
    try {
      setShowEventMenu(false);
      setIsSendingMessage(true);
      
      const userMessageContent = `Meeting Insights for: ${event.title}`;
      const prompt = `Provide meeting insights and preparation for:
Title: ${event.title}
Date: ${new Date(event.start).toLocaleDateString()} at ${new Date(event.start).toLocaleTimeString()}
Description: ${event.description || 'No description provided'}
Attendees: ${event.attendees?.join(', ') || 'No attendees listed'}

Please provide:
1. Key talking points
2. Suggested agenda items
3. Questions to ask
4. Follow-up actions to consider`;

      // Create new chat
      const chatResponse = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Meeting Insights: ${event.title}`,
          initialMessage: userMessageContent
        }),
      });

      let newChatId = null;
      if (chatResponse.ok) {
        const { chat } = await chatResponse.json();
        newChatId = chat.id;
        setCurrentChatId(newChatId);
      }

      // Show user's prompt in chat
      const userMessage: ChatMessage = {
        role: 'user',
        content: userMessageContent,
        timestamp: new Date().toISOString()
      };
      setChatMessages([userMessage]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          conversationHistory: [],
          userContext: userData?.user_context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(line.substring(6));
                if (jsonData.content) {
                  accumulatedContent += jsonData.content;
                  // Update chat in real-time
                  const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: accumulatedContent,
                    timestamp: new Date().toISOString()
                  };
                  setChatMessages([userMessage, assistantMessage]);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // Save final assistant message to chat
        if (newChatId && accumulatedContent) {
          await fetch(`/api/chats/${newChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'assistant',
              content: accumulatedContent
            }),
          });
        }
        
        await createActivityLog('meeting_scheduled', `Meeting Insights: ${event.title}`, `Generated insights for meeting with ${event.attendees?.join(', ')}`);
        loadChatHistory(); // Reload chat list
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleGenerateEmail(event: CalendarEvent) {
    try {
      setShowEventMenu(false);
      setIsSendingMessage(true);
      
      const userMessageContent = `Generate Email for: ${event.title}`;
      const prompt = `Generate a professional follow-up email for:
Title: ${event.title}
Date: ${new Date(event.start).toLocaleDateString()} at ${new Date(event.start).toLocaleTimeString()}
Description: ${event.description || 'No description provided'}
Attendees: ${event.attendees?.join(', ') || 'No attendees listed'}

Include: greeting, meeting confirmation, brief agenda, offer to share materials, professional closing.`;

      // Create new chat
      const chatResponse = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Email: ${event.title}`,
          initialMessage: userMessageContent
        }),
      });

      let newChatId = null;
      if (chatResponse.ok) {
        const { chat } = await chatResponse.json();
        newChatId = chat.id;
        setCurrentChatId(newChatId);
      }

      // Show user's prompt in chat
      const userMessage: ChatMessage = {
        role: 'user',
        content: userMessageContent,
        timestamp: new Date().toISOString()
      };
      setChatMessages([userMessage]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          conversationHistory: [],
          userContext: userData?.user_context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(line.substring(6));
                if (jsonData.content) {
                  accumulatedContent += jsonData.content;
                  // Update chat in real-time
                  const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: accumulatedContent,
                    timestamp: new Date().toISOString()
                  };
                  setChatMessages([userMessage, assistantMessage]);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // Save final assistant message to chat
        if (newChatId && accumulatedContent) {
          await fetch(`/api/chats/${newChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'assistant',
              content: accumulatedContent
            }),
          });
        }
        
        await createActivityLog('email_draft_created', `Email Generated: ${event.title}`, `Generated email for meeting with ${event.attendees?.join(', ')}`);
        loadChatHistory(); // Reload chat list
      }
    } catch (error) {
      console.error('Error generating email:', error);
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function checkConnections() {
    try {
      // Check Outlook connection - use status endpoint to verify actual tokens
      const outlookResponse = await fetch('/api/outlook/status');
      if (outlookResponse.ok) {
        const outlookData = await outlookResponse.json();
        console.log('🔍 Outlook connection check:', outlookData);
        // More robust boolean check - handle string/boolean conversion
        const isConnected = Boolean(outlookData.connected) && outlookData.connected !== 'false' && outlookData.connected !== false;
        console.log('✅ Outlook connected:', isConnected);
        setHasOutlookConnection(isConnected);
      } else {
        console.log('❌ Outlook status check failed:', outlookResponse.status);
        setHasOutlookConnection(false);
      }

      // Check Salesforce connection - need to verify actual tokens exist
      const sfResponse = await fetch('/api/salesforce/auth-user');
      if (sfResponse.ok) {
        const sfData = await sfResponse.json();
        console.log('🔍 Salesforce connection check:', sfData);
        // Only set as connected if we have an authUrl (meaning not connected)
        // If already connected, the API returns the connection status
        const isConnected = sfData.connected === true;
        console.log('✅ Salesforce connected:', isConnected);
        setHasSalesforceConnection(isConnected);
      } else {
        console.log('❌ Salesforce API failed:', sfResponse.status);
        setHasSalesforceConnection(false);
      }
    } catch (error) {
      console.error('Error checking connections:', error);
      setHasSalesforceConnection(false);
      setHasOutlookConnection(false);
    }
  }

  async function connectOutlook() {
    try {
      console.log('🔵 Step 1: Connecting to Outlook...');
      console.log('🔵 Step 2: Fetching /api/outlook/auth-user...');
      const response = await fetch('/api/outlook/auth-user', {
        method: 'GET',
        credentials: 'include', // Include cookies for NextAuth session
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('🔵 Step 3: Response received. Status:', response.status);
      console.log('🔵 Step 3: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔵 Step 4: Response data:', data);
        
        if (data.authUrl) {
          console.log('🔵 Step 5: Got authUrl, redirecting to:', data.authUrl);
          console.log('🔵 Step 5: About to set window.location.href...');
          window.location.href = data.authUrl;
          console.log('🔵 Step 6: window.location.href set (this may not log if redirect happens immediately)');
        } else {
          console.error('❌ No authUrl in response:', data);
          alert('Failed to get Outlook authorization URL. Check console for details.');
        }
      } else {
        console.error('❌ Response not OK. Status:', response.status);
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = await response.text();
        }
        console.error('❌ Error data:', errorData);
        alert(`Failed to connect Outlook (${response.status}): ${typeof errorData === 'object' ? errorData.error : errorData || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Exception in connectOutlook:', error);
      alert(`Error connecting Outlook: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function connectSalesforce() {
    try {
      console.log('🟣 Step 1: Connecting to Salesforce...');
      console.log('🟣 Step 2: Fetching /api/salesforce/auth-user...');
      const response = await fetch('/api/salesforce/auth-user', {
        method: 'GET',
        credentials: 'include', // Include cookies for NextAuth session
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('🟣 Step 3: Response received. Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🟣 Step 4: Response data:', data);
        
        if (data.authUrl) {
          console.log('🟣 Step 5: Got authUrl, redirecting to:', data.authUrl);
          window.location.href = data.authUrl;
          console.log('🟣 Step 6: window.location.href set');
        } else {
          console.error('❌ No authUrl in Salesforce response:', data);
          alert('Failed to get Salesforce authorization URL. Check console for details.');
        }
      } else {
        console.error('❌ Salesforce response not OK. Status:', response.status);
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = await response.text();
        }
        console.error('❌ Salesforce error data:', errorData);
        alert(`Failed to connect Salesforce (${response.status}): ${typeof errorData === 'object' ? errorData.error : errorData || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Exception in connectSalesforce:', error);
      alert(`Error connecting Salesforce: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function addToEmailDrafts(content: string, subject?: string) {
    // Check if Outlook is connected
    if (!hasOutlookConnection) {
      setConnectionService('outlook');
      setShowConnectionModal(true);
      return;
    }

    try {
      console.log('📧 Creating Outlook draft directly:', { subject, contentLength: content.length });
      
      // Extract recipient email from content if possible
      const emailMatch = content.match(/to\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      const recipientEmail = emailMatch ? emailMatch[1] : 'recipient@example.com';
      
      // Call the Outlook draft creation API directly
      const response = await fetch('/api/outlook/create-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: subject || 'Draft from Curiosity Engine',
          body: content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Draft creation failed:', errorData);
        alert(`❌ Failed to create draft: ${errorData.error || response.statusText}`);
        return;
      }

      const result = await response.json();
      console.log('✅ Draft created successfully:', result);
      
      alert(`✅ Email draft created successfully in Outlook!
Recipient: ${recipientEmail}
Subject: ${subject || 'Draft from Curiosity Engine'}

The draft is now in your Outlook Drafts folder and ready to send.`);
      
      await createActivityLog('email_draft_created', `Email Draft: ${subject || 'Draft from Curiosity Engine'}`, 'Draft created in Outlook');
    } catch (error) {
      console.error('❌ Error creating draft:', error);
      alert(`❌ Error creating draft: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function updateCRM(content: string) {
    // Check if Salesforce is connected
    if (!hasSalesforceConnection) {
      setConnectionService('salesforce');
      setShowConnectionModal(true);
      return;
    }

    try {
      // Extract lead information from content (basic parsing)
      // This is a simple implementation - can be enhanced with better AI parsing
      const leadName = selectedEvent?.title || 'Unknown Lead';
      const company = selectedEvent?.description || 'Unknown Company';
      
      const response = await fetch('/api/salesforce/enrich-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName,
          company,
          title: '',
          email: '',
          phone: '',
          notes: content
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}`);
        await createActivityLog('crm_lead_enriched', `Lead Enriched: ${leadName}`, content.substring(0, 200));
      } else {
        alert('❌ Failed to update Salesforce. Please try again.');
      }
    } catch (error) {
      console.error('Error updating CRM:', error);
      alert('❌ Error updating CRM. Please try again.');
    }
  }

  async function loadProfileData() {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          full_name: data.user.full_name || '',
          job_title: data.user.job_title || '',
          company_name: data.user.company_name || '',
          company_url: data.user.company_url || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function saveProfileData() {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        alert('✅ Profile saved successfully!');
      } else {
        alert('❌ Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('❌ Error saving profile');
    }
  }

  async function loadSalesMaterials() {
    try {
      const response = await fetch('/api/sales-materials');
      if (response.ok) {
        const data = await response.json();
        setSalesMaterials(data.materials || []);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'sales_guide');

      const response = await fetch('/api/sales-materials', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('✅ File uploaded successfully!');
        loadSalesMaterials();
        await createActivityLog('integration_connected', `Sales Material Uploaded: ${file.name}`);
      } else {
        alert('❌ Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('❌ Error uploading file');
    } finally {
      setUploadingFile(false);
      event.target.value = ''; // Reset input
    }
  }

  async function deleteMaterial(materialId: string) {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const response = await fetch(`/api/sales-materials?id=${materialId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Material deleted');
        loadSalesMaterials();
      } else {
        alert('❌ Failed to delete material');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('❌ Error deleting material');
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
              { id: 'logs', label: '📋 Activity Logs', icon: '📋' },
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
            {/* Floating sidebar toggle when collapsed */}
            {!showChatSidebar && (
              <button
                onClick={() => setShowChatSidebar(true)}
                className="fixed left-6 top-1/2 -translate-y-1/2 bg-[#F95B14] text-white p-3 rounded-r-lg shadow-lg hover:bg-orange-600 transition-all z-40"
                title="Show chat history"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Chat History Sidebar - Collapsible */}
            {showChatSidebar && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-[700px] flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Chats</h3>
                      <button
                        onClick={() => setShowChatSidebar(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Collapse sidebar"
                      >
                        ◀
                      </button>
                    </div>
                    <button
                      onClick={startNewChat}
                      className="w-full bg-[#F95B14] text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 font-semibold"
                    >
                      <span className="text-xl">+</span> New Chat
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
                    {chatHistory.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-3xl mb-2">💬</div>
                        <p className="text-sm">No chats yet</p>
                        <p className="text-xs mt-1">Start a conversation</p>
                      </div>
                    )}
                    {chatHistory.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => loadChat(chat.id)}
                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                          currentChatId === chat.id ? 'bg-orange-50 border-l-4 border-[#F95B14]' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">{chat.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI Chat - Expands when sidebar collapsed */}
            <div className={showChatSidebar ? 'lg:col-span-2' : 'lg:col-span-3'}>
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
                      <div className={`max-w-[80%] ${
                        msg.role === 'user' ? '' : 'space-y-2'
                      }`}>
                        <div className={`rounded-lg px-4 py-2 ${
                        msg.role === 'user' 
                          ? 'bg-[#F95B14] text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                        </div>
                        {/* Action buttons for assistant messages */}
                        {msg.role === 'assistant' && (
                          <div className="flex gap-3 mt-2 mb-4">
                            {/* Email Draft Action - Only show if Outlook is connected */}
                            {hasOutlookConnection && (
                              <div className="group relative">
                                <button
                                  onClick={() => addToEmailDrafts(msg.content, selectedEvent?.title)}
                                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center cursor-pointer hover:border-[#F95B14] hover:shadow-md transition-all"
                                >
                                  <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                                  </svg>
                                </button>
                                {/* Hover tooltip - positioned to the right */}
                                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap z-50">
                                  ✉️ Create Draft in Outlook
                                  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-0 border-4 border-transparent border-r-gray-900"></div>
                                </div>
                              </div>
                            )}

                            {/* CRM Action - Only show if Salesforce is connected */}
                            {hasSalesforceConnection && (
                              <div className="group relative">
                                <button
                                  onClick={() => updateCRM(msg.content)}
                                  className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all p-2"
                                >
                                  <Image
                                    src="/salesforcelogo.svg"
                                    alt="Salesforce"
                                    width={20}
                                    height={20}
                                    className="w-full h-full"
                                  />
                                </button>
                                {/* Hover tooltip - positioned to the right */}
                                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap z-50">
                                  🎯 Enrich Lead in Salesforce
                                  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-0 border-4 border-transparent border-r-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
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
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">📅 Upcoming Events</h2>
                  <button
                    onClick={syncCalendar}
                    disabled={isSyncingCalendar}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isSyncingCalendar ? (
                      <>
                        <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        Sync
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 space-y-3 max-h-[640px] overflow-y-auto overflow-x-visible">
                  {calendarEvents.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <div className="text-3xl mb-2">📅</div>
                      <p className="text-sm">No upcoming events</p>
                      <p className="text-xs mt-1">Connect your calendar to see events</p>
                    </div>
                  )}

                  {calendarEvents.map((event, index) => (
                    <div key={event.id} className="relative" style={{ zIndex: calendarEvents.length - index }}>
                      <div 
                        className="border border-gray-200 rounded-lg p-3 hover:border-[#F95B14] hover:bg-orange-50 transition-all cursor-pointer group"
                        onClick={(e) => handleCalendarEventClick(event, e)}
                      >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 text-sm">{event.title}</h3>
                              <span className="text-xs text-gray-400 group-hover:text-[#F95B14] transition-colors">
                                ⚡ Actions
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
                      
                      {/* Dropdown Menu - appears below for first 2 items, above for last items */}
                      {showEventMenu && selectedEvent?.id === event.id && (
                        <div 
                          className={`absolute left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 ${
                            index <= 1 ? 'top-full mt-1' : 'bottom-full mb-1'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMeetingInsights(event);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm border-b border-gray-100 flex items-center gap-2"
                          >
                            <span>💡</span>
                            <span>Meeting Insights</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateEmail(event);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
                          >
                            <span>✉️</span>
                            <span>Generate Email</span>
                          </button>
                        </div>
                      )}
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
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Settings */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">⚙️ Settings</h2>
              
              {/* User Profile Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={profileData.job_title}
                      onChange={(e) => setProfileData({...profileData, job_title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
                      placeholder="Sales Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={profileData.company_name}
                      onChange={(e) => setProfileData({...profileData, company_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company URL
                    </label>
                    <input
                      type="url"
                      value={profileData.company_url}
                      onChange={(e) => setProfileData({...profileData, company_url: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
                      placeholder="https://acme.com"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={saveProfileData}
                    className="bg-[#F95B14] text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Save Profile
                  </button>
                </div>
              </div>

              {/* Context Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Context</h3>
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

              {/* Sales Materials Upload */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Materials & Guides</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload PDFs, presentations, or documents that contain sales guides, product information, or company materials. 
                  The AI will use this information to provide better assistance.
                </p>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#F95B14] transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.pptx"
                    className="hidden"
                    id="sales-materials-upload"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                  <label
                    htmlFor="sales-materials-upload"
                    className="cursor-pointer"
                  >
                    {uploadingFile ? (
                      <>
                        <div className="text-4xl mb-2">⏳</div>
                        <p className="text-sm font-medium text-gray-900">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-sm font-medium text-gray-900">Click to upload sales materials</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, PPTX (Max 10MB)</p>
                      </>
                    )}
                  </label>
          </div>
                {/* Uploaded files list */}
                <div className="mt-4 space-y-2">
                  {salesMaterials.length > 0 && (
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Materials ({salesMaterials.length})</h4>
                  )}
                  {salesMaterials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{material.file_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {material.category} • {(material.file_size / 1024).toFixed(1)} KB • {new Date(material.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteMaterial(material.id)}
                        className="text-red-600 hover:text-red-800 transition-colors ml-4"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upgrade Section */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-[#F95B14] rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">🚀 Upgrade to Company Plan</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Get advanced features including:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 mb-4">
                      <li>✓ Team collaboration & shared context</li>
                      <li>✓ Unlimited sales material storage</li>
                      <li>✓ Advanced CRM integrations</li>
                      <li>✓ Custom AI training on your data</li>
                      <li>✓ Priority support</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => {
                    window.location.href = `mailto:hello@curiosityengine.io?subject=Upgrade to Company Plan&body=Hi,%0A%0AI would like to upgrade to the Company Plan.%0A%0AName: ${userData.full_name}%0AEmail: ${userData.email}%0A%0APlease send me more information.%0A%0AThanks!`;
                  }}
                  className="bg-[#F95B14] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                >
                  📧 Request Upgrade
                </button>
              </div>
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
              <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:shadow-lg transition-shadow">
                <div>
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
                    {hasSalesforceConnection ? (
                      <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                        Ready to Connect
                      </span>
                    )}
                    {hasSalesforceConnection ? (
                      <button
                        onClick={disconnectSalesforce}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={connectToSalesforce}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#F95B14] rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Connect
                      </button>
                    )}
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
                <div>
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
                <div>
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
                <div>
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
                    {hasOutlookConnection ? (
                      <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                        Ready to Connect
                      </span>
                    )}
                    {hasOutlookConnection ? (
                      <button
                        onClick={disconnectOutlook}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🔴🔴🔴 BUTTON CLICKED!');
                          connectToOutlook().catch(err => console.error('🔴 Button click error:', err));
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#F95B14] rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Connect
                      </button>
                    )}
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
                <div>
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
                <div>
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

        {activeTab === 'logs' && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">📋 Activity Logs</h2>
                <p className="text-gray-600 mt-2">Track all AI-powered actions and integrations</p>
      </div>

              <div className="divide-y divide-gray-200">
                {activityLogs.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <div className="text-4xl mb-4">📋</div>
                    <p className="text-lg font-medium">No activity yet</p>
                    <p className="text-sm mt-2">Actions like email drafts and CRM updates will appear here</p>
                  </div>
                )}

                {activityLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {log.action_type === 'email_draft_created' && '✉️'}
                            {log.action_type === 'email_sent' && '📧'}
                            {log.action_type === 'crm_lead_enriched' && '🎯'}
                            {log.action_type === 'crm_note_added' && '📝'}
                            {log.action_type === 'meeting_scheduled' && '📅'}
                            {log.action_type === 'linkedin_analysis' && '💼'}
                            {log.action_type === 'integration_connected' && '🔌'}
                            {log.action_type === 'integration_disconnected' && '⚠️'}
                          </span>
                          <h3 className="font-medium text-gray-900">{log.action_title}</h3>
                        </div>
                        {log.action_description && (
                          <p className="text-sm text-gray-600 mt-1 ml-7">{log.action_description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1 ml-7">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.status === 'completed' ? 'bg-green-100 text-green-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowConnectionModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Connect {connectionService === 'outlook' ? 'Outlook' : 'Salesforce'}
                </h3>
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="flex justify-center mb-6">
                {connectionService === 'outlook' ? (
                  <Image
                    src="/outlook.svg"
                    alt="Outlook"
                    width={80}
                    height={80}
                    className="w-20 h-20"
                  />
                ) : (
                  <Image
                    src="/salesforcelogo.svg"
                    alt="Salesforce"
                    width={80}
                    height={80}
                    className="w-20 h-20"
                  />
                )}
              </div>

              <p className="text-gray-600 text-center mb-6">
                {connectionService === 'outlook' 
                  ? 'Connect your Outlook account to create email drafts directly from the dashboard.'
                  : 'Connect your Salesforce account to enrich leads and sync CRM data automatically.'}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowConnectionModal(false);
                    if (connectionService === 'outlook') {
                      connectOutlook();
                    } else {
                      connectSalesforce();
                    }
                  }}
                  className="w-full bg-[#F95B14] text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                >
                  Connect {connectionService === 'outlook' ? 'Outlook' : 'Salesforce'}
                </button>
                <button
                  onClick={() => setShowConnectionModal(false)}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

