'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';

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
  thinking?: string; // Reasoning/thinking content from DeepSeek-R1
  showThinking?: boolean; // Whether thinking section is expanded
  model?: string; // Which model generated this message
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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventMenu, setShowEventMenu] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // AI Model selection state
  const [selectedModel, setSelectedModel] = useState('DeepSeek-R1-0528');
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [modelSwitchNotification, setModelSwitchNotification] = useState('');
  const [showConversations, setShowConversations] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  // Available models from SambaNova Cloud (only models that support tool/function calling)
  const availableModels = [
    { id: 'DeepSeek-R1-0528', name: 'DeepSeek R1 (671B)', provider: 'SambaNova', description: 'Most powerful - Best for complex reasoning' },
    { id: 'DeepSeek-V3-0324', name: 'DeepSeek V3', provider: 'SambaNova', description: 'Powerful general-purpose model' },
    { id: 'DeepSeek-V3.1', name: 'DeepSeek V3.1', provider: 'SambaNova', description: 'Latest DeepSeek version' },
    { id: 'Meta-Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', provider: 'SambaNova', description: 'Fast and efficient - Great balance' },
    { id: 'Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', provider: 'SambaNova', description: 'Ultra-fast - Simple tasks' },
  ];
  
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
  const [userPermissions, setUserPermissions] = useState<any>(null);
  
  // Team invitation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'org_admin'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadMessageType, setUploadMessageType] = useState<'success' | 'error' | ''>('');
  
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

  // Helper function to parse thinking tags from DeepSeek-R1 responses
  const parseThinkingTags = (content: string): { thinking: string; final: string } => {
    const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
    const thinking = thinkMatch ? thinkMatch[1].trim() : '';
    
    let final = '';
    if (content.includes('</think>')) {
      final = content.split('</think>')[1] || '';
    } else if (!content.includes('<think>')) {
      final = content;
    }
    
    return { thinking, final: final.trim() };
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated' && session?.user) {
      checkAuth();
      
      // Check for URL parameters from extension
      const params = new URLSearchParams(window.location.search);
      if (params.get('openChat') === 'true') {
        const profileName = params.get('profile');
        const analysis = params.get('analysis');
        
        if (profileName && analysis) {
          setTimeout(() => {
            handleOpenChatFromExtension(decodeURIComponent(profileName), decodeURIComponent(analysis));
          }, 1000); // Wait for auth to complete
        }
      }
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

  // Close model dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showModelDropdown && !target.closest('.model-dropdown-container')) {
        setShowModelDropdown(false);
      }
    };
    
    if (showModelDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showModelDropdown]);

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showAccountMenu && !target.closest('.account-menu-container')) {
        setShowAccountMenu(false);
      }
    };
    
    if (showAccountMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showAccountMenu]);

  async function checkAuth() {
    try {
      if (!session?.user?.email) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      
      // Fetch user data from database
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (userData) {
        setUserData(userData);
      } else {
        // User doesn't exist - auto-create via API
        console.log('🆕 User not found, creating record for:', session.user.email);
        
        try {
          const createResponse = await fetch('/api/user/ensure-exists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
          });
          
          if (createResponse.ok) {
            // Fetch again
            const { data: newUserData } = await supabase
              .from('users')
              .select('*')
              .eq('email', session.user.email)
              .maybeSingle();
            
            if (newUserData) {
              setUserData(newUserData);
            } else {
              // Fallback to session data
              setUserData({
                id: session.user.id || '',
                email: session.user.email,
                full_name: session.user.name || session.user.email?.split('@')[0] || 'User',
                role: 'member',
                user_context: { aboutMe: '', objectives: '' }
              });
            }
          }
        } catch (createError) {
          console.error('Error auto-creating user:', createError);
          // Fallback to session data
          setUserData({
            id: session.user.id || '',
            email: session.user.email,
            full_name: session.user.name || session.user.email?.split('@')[0] || 'User',
            role: 'member',
            user_context: { aboutMe: '', objectives: '' }
          });
        }
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
      console.log('📂 Loading chat:', chatId);
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json();
        console.log('📨 Received messages:', data.messages?.length || 0);
        const messages = data.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          thinking: msg.metadata?.thinking || msg.thinking || '',
          showThinking: false,
          model: msg.metadata?.model || msg.model || ''
        }));
        setChatMessages(messages);
        setCurrentChatId(chatId);
        console.log('✅ Chat loaded with', messages.length, 'messages');
      } else {
        console.error('❌ Failed to load chat:', response.status);
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

      console.log('🤖 Sending message to SambaNova Cloud:', { model: selectedModel });
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          conversationHistory: chatMessages,
          userContext: userData?.user_context,
          calendarEvents,
          model: selectedModel // Pass selected model to API
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let thinkingContent = '';
      let finalContent = '';
      let inThinkingTag = false;

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
                  
                  // Parse thinking tags from DeepSeek-R1 response
                  const { thinking, final } = parseThinkingTags(accumulatedContent);
                  
                  // Update the assistant message in real-time
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: final,
                      thinking,
                      showThinking: false, // Collapsed by default
                      model: selectedModel // Track which model generated this
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
                  // Save final assistant message with parsed thinking
                  if (currentChatId && accumulatedContent) {
                    const { thinking, final } = parseThinkingTags(accumulatedContent);
                    await fetch(`/api/chats/${currentChatId}/messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        role: 'assistant',
                        content: final,
                        thinking: thinking,
                        model: selectedModel
                      }),
                    });
                    console.log('💾 Saved assistant message to chat:', currentChatId);
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

      console.log('🤖 Meeting Insights - Using SambaNova model:', selectedModel);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          conversationHistory: [],
          userContext: userData?.user_context,
          model: selectedModel // Pass selected model
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
                  // Parse thinking tags
                  const { thinking, final } = parseThinkingTags(accumulatedContent);
                  // Update chat in real-time
                  const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: final,
                    thinking,
                    showThinking: false,
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
          const { thinking, final } = parseThinkingTags(accumulatedContent);
          await fetch(`/api/chats/${newChatId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'assistant',
              content: final,
              thinking
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
      const prompt = `You are writing a follow-up email for a meeting. Write ONLY the email body - no instructions, no meta-text, no suggestions to customize.

**Meeting Details:**
- Title: ${event.title}
- Date: ${new Date(event.start).toLocaleDateString()} at ${new Date(event.start).toLocaleTimeString()}
- Description: ${event.description || 'No description provided'}
- Attendees: ${event.attendees?.join(', ') || 'No attendees listed'}

Write a complete, professional follow-up email that includes:
1. Warm greeting (use first name from attendees if available)
2. Meeting confirmation (date, time)
3. Brief agenda with 3-4 bullet points
4. Offer to share materials
5. Professional closing with next steps
6. Keep it under 200 words

Format with markdown:
- Use ### for section headings
- Use bullet points (•) for lists  
- Use **bold** for emphasis
- Add relevant emojis (📅, 🎯, etc.)

IMPORTANT: Write ONLY the email body. Do NOT include phrases like "Feel free to customize" or "Here's the email" or any instructions. Start directly with the greeting and end with the signature.`;

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
  
  async function handleOpenChatFromExtension(profileName: string, analysis: string) {
    try {
      setIsSendingMessage(true);
      
      const userMessageContent = `Draft an email to ${profileName}`;
      const prompt = `Based on this LinkedIn profile analysis, draft a professional outreach email:

${analysis}

Create a personalized email that:
1. References specific details from their profile
2. Explains why you're reaching out
3. Proposes a clear value proposition
4. Includes a soft call-to-action
5. Keeps it concise (under 150 words)

Format with markdown for readability.`;

      // Create new chat
      const chatResponse = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `LinkedIn: ${profileName}`,
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
        
        await createActivityLog('linkedin_analysis', `LinkedIn Profile: ${profileName}`, 'Opened from Chrome extension');
        loadChatHistory();
      }
      
      // Clear URL parameters
      window.history.replaceState({}, '', '/dashboard');
    } catch (error) {
      console.error('Error opening chat from extension:', error);
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

  async function addToEmailDrafts(content: string, subject?: string, recipients?: string[]) {
    // Check if Outlook is connected
    if (!hasOutlookConnection) {
      setConnectionService('outlook');
      setShowConnectionModal(true);
      return;
    }

    try {
      console.log('📧 Creating Outlook draft:', { subject, contentLength: content.length, recipients });
      
      // Clean up any meta-text or instructions from AI response
      let cleanedContent = content;
      
      // Remove common AI meta-phrases
      const metaPhrases = [
        /Feel free to customize.*?(\n|$)/gi,
        /Here'?s (a|the) (email|draft|message).*?(\n|$)/gi,
        /\*\*Follow-up Email (Draft Created|Overview).*?\*\*/gi,
        /I'?ve prepared.*?(\n|$)/gi,
        /You can find the draft.*?(\n|$)/gi,
        /Please review.*?(\n|$)/gi,
        /Let me know if.*?(\n|$)/gi,
        /^---\s*$/gm, // Remove standalone dividers
      ];
      
      metaPhrases.forEach(phrase => {
        cleanedContent = cleanedContent.replace(phrase, '');
      });
      
      // Trim extra whitespace
      cleanedContent = cleanedContent.trim();
      
      // Use provided recipients or try to extract from content
      let recipientEmail = 'recipient@example.com';
      if (recipients && recipients.length > 0) {
        recipientEmail = recipients[0]; // Use first attendee
      } else {
        const emailMatch = cleanedContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch) recipientEmail = emailMatch[1];
      }
      
      // Convert markdown to HTML for Outlook
      const htmlContent = await marked(cleanedContent, {
        breaks: true,
        gfm: true,
      });
      
      // Wrap in professional email styling
      const styledHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">
          ${htmlContent}
          <br><br>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px;">
            <p><em>Sent via Curiosity Engine</em></p>
          </div>
        </div>
      `;
      
      // Call the Outlook draft creation API
      const response = await fetch('/api/outlook/create-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: subject || 'Draft from Curiosity Engine',
          body: styledHtml
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
      
      await createActivityLog('email_draft_created', `Email Draft: ${subject || 'Draft from Curiosity Engine'}`, `Draft created for ${recipientEmail}`);
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
        setUserPermissions(data.permissions || null);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  }

  async function shareMaterial(materialId: string, visibility: 'private' | 'team' | 'organization') {
    try {
      const response = await fetch('/api/sales-materials/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, visibility }),
      });

      if (response.ok) {
        alert(`✅ Material ${visibility === 'private' ? 'is now private' : 'shared with ' + visibility}`);
        loadSalesMaterials();
      } else {
        const error = await response.json();
        alert(`❌ Failed to share: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sharing material:', error);
      alert('❌ Error sharing material');
    }
  }

  async function handleSendInvitation() {
    if (!inviteEmail) {
      alert('Please enter an email address');
      return;
    }

    setInviteLoading(true);
    setInviteMessage('');

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          permissions: {
            can_view_org_materials: true,
            can_upload_materials: true,
            can_delete_own_materials: true,
            can_share_materials: inviteRole === 'org_admin',
            can_view_team_analyses: true,
            can_view_team_emails: false,
          }
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteMessage(`✅ Invitation sent to ${inviteEmail}!\n\nShare this link:\n${data.invitationLink}`);
      setInviteEmail('');
      setInviteRole('member');
    } catch (err: any) {
      console.error('Invitation error:', err);
      setInviteMessage(`❌ ${err.message}`);
    } finally {
      setInviteLoading(false);
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
        setUploadMessage('✅ File uploaded successfully!');
        setUploadMessageType('success');
        loadSalesMaterials();
        await createActivityLog('integration_connected', `Sales Material Uploaded: ${file.name}`);
        // Clear message after 3 seconds
        setTimeout(() => {
          setUploadMessage('');
          setUploadMessageType('');
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setUploadMessage(`❌ Failed to upload file: ${errorData.error || 'Unknown error'}`);
        setUploadMessageType('error');
        // Clear message after 5 seconds for errors
        setTimeout(() => {
          setUploadMessage('');
          setUploadMessageType('');
        }, 5000);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadMessage('❌ Error uploading file');
      setUploadMessageType('error');
      // Clear message after 5 seconds for errors
      setTimeout(() => {
        setUploadMessage('');
        setUploadMessageType('');
      }, 5000);
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
    <div className="min-h-screen bg-white">
      {/* Header - Full Width */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="w-full px-6 py-3">
          <div className="flex justify-between items-center">
            {/* Logo - Far Left */}
            <div className="flex items-center">
              <Image
                src="/fulllogo_transparent_nobuffer.png"
                alt="Curiosity Engine"
                width={270}
                height={72}
                className="h-12 w-auto"
              />
            </div>
            
            {/* Account Menu - Far Right */}
            <div className="relative account-menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAccountMenu(!showAccountMenu);
                }}
                className="flex items-center space-x-3 px-3 py-2 rounded-full hover:bg-gray-50 transition-all duration-200"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{userData?.full_name || 'User'}</div>
                  <div className="text-xs text-gray-500">{userData?.email}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F95B14] to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                  {(userData?.full_name || userData?.email || 'U')[0].toUpperCase()}
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Account Dropdown */}
              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                  {/* User Info */}
                  <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F95B14] to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                        {(userData?.full_name || userData?.email || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900">{userData?.full_name || 'User'}</div>
                        <div className="text-xs text-gray-500">{userData?.email}</div>
                        {userData?.role && (
                          <div className="mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                              {userData.role === 'org_admin' ? '👑 Admin' : '👤 Member'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          router.push('/admin/organization');
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Organization</div>
                          <div className="text-xs text-gray-500">Manage team & settings</div>
                        </div>
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        setActiveTab('context');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Settings</div>
                        <div className="text-xs text-gray-500">Profile & preferences</div>
                      </div>
                    </button>

                    <div className="my-2 border-t border-gray-100"></div>

                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center space-x-3 text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium">Log out</div>
                        <div className="text-xs">Sign out of your account</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Horizontal Navigation Menu - Below Logo/Account */}
        <div className="w-full border-t border-gray-100">
          <div className="w-full px-6">
            <div className="flex space-x-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>) },
                { id: 'leads', label: 'Leads', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>) },
                { id: 'context', label: 'Settings', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>) },
                { id: 'integrations', label: 'Connectors', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>) },
                { id: 'logs', label: 'Activity', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>) },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-150 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#F95B14] text-[#F95B14]'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="relative">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[calc(100vh-130px)]" style={{ overflow: 'visible' }}>
            {/* Chat History Sidebar - Always Visible */}
            <div className="lg:col-span-2 h-full overflow-hidden">
              <div className="bg-white border-r border-gray-100 h-full flex flex-col w-64">
                  <div className="p-3">
                    <motion.button
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={startNewChat}
                      className="w-full bg-[#F95B14] text-white px-3 py-2.5 rounded-lg hover:bg-orange-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium text-sm shadow-sm hover:shadow"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    New chat
                  </motion.button>
                </div>

                  {/* Chat History Section */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Section Title - Sticky & Collapsible */}
                    <div className="sticky top-0 bg-white z-10 px-3 pt-4 pb-2 border-b border-gray-100">
                      <button
                        onClick={() => setShowConversations(!showConversations)}
                        className="w-full flex items-center justify-between group hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
                      >
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Conversations
                        </h3>
                        <svg 
                          className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-all duration-200 ${
                            showConversations ? '' : '-rotate-90'
                          }`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Scrollable Conversations List */}
                    {showConversations && (
                      <div className="flex-1 overflow-y-auto px-2">
                        {chatHistory.length === 0 && (
                          <div className="p-8 text-center">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-xs text-gray-500">No chats yet</p>
                          </div>
                        )}
                        <div className="space-y-0.5 py-2">
                      {chatHistory.map((chat) => (
                        <motion.button
                          key={chat.id}
                          whileHover={{ x: 2, backgroundColor: 'rgba(249, 250, 251, 1)' }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => loadChat(chat.id)}
                          className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 group relative ${
                            currentChatId === chat.id 
                              ? 'bg-gray-100 text-gray-900' 
                              : 'text-gray-700'
                          }`}
                        >
                          {currentChatId === chat.id && (
                            <motion.div 
                              layoutId="activeChatIndicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#F95B14] rounded-r-full"
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          )}
                          <div className="flex items-start gap-2.5">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{chat.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(chat.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {/* AI Chat - Takes remaining 10 columns */}
            <div className="lg:col-span-10 h-full overflow-hidden flex flex-col relative">
              {/* Calendar Toggle Button (top-right of chat) */}
              <button
                onClick={() => setShowCalendarPanel(!showCalendarPanel)}
                className="absolute top-4 right-10 z-20 bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                title="Toggle calendar"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              <div className="bg-white h-full flex flex-col px-6">

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="max-w-4xl mx-auto mt-20">
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">What can I help you with?</h2>
                        <p className="text-sm text-gray-600">Choose a prompt or type your own message below</p>
                      </div>
                      
                      {/* Sample Prompt Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Calendar Prompt */}
                        <button
                          onClick={() => {
                            setChatInput("Check my calendar and tell me what meetings I have coming up");
                            setTimeout(() => sendChatMessage(), 100);
                          }}
                          className="group p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {/* Google Calendar Icon */}
                              <img
                                src="/google-calendar.svg"
                                alt="Google Calendar"
                                className="w-7 h-7"
                              />
                              {/* Outlook Icon */}
                              <img
                                src="/icons8-outlook-calendar-480.svg"
                                alt="Outlook Calendar"
                                className="w-7 h-7"
                              />
                            </div>
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            Check my calendar
                          </h3>
                          <p className="text-sm text-gray-600">
                            Review upcoming meetings and schedule
                          </p>
                        </button>

                        {/* CRM Prompt */}
                        <button
                          onClick={() => {
                            setChatInput("Research my late stage leads and give me insights on next steps");
                            setTimeout(() => sendChatMessage(), 100);
                          }}
                          className="group p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {/* Salesforce Logo */}
                            <img
                              src="/salesforcelogo.svg"
                              alt="Salesforce"
                              className="h-7 w-auto"
                            />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            Research my late stage leads
                          </h3>
                          <p className="text-sm text-gray-600">
                            Analyze pipeline and get next step recommendations
                          </p>
                        </button>

                        {/* Email Prompt */}
                        <button
                          onClick={() => {
                            setChatInput("Help me draft a follow-up email to my latest prospect");
                            setTimeout(() => sendChatMessage(), 100);
                          }}
                          className="group p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {/* Gmail Icon */}
                              <img
                                src="/gmail-icon.svg"
                                alt="Gmail"
                                className="w-7 h-7"
                              />
                              {/* Outlook Icon */}
                              <img
                                src="/Outlook_icon.svg"
                                alt="Outlook"
                                className="w-7 h-7"
                              />
                            </div>
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            Draft an email
                          </h3>
                          <p className="text-sm text-gray-600">
                            Create personalized outreach messages
                          </p>
                        </button>

                        {/* LinkedIn Post Prompt */}
                        <button
                          onClick={() => {
                            setChatInput("Generate a LinkedIn post using my most recent company info and materials");
                            setTimeout(() => sendChatMessage(), 100);
                          }}
                          className="group p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {/* LinkedIn Icon */}
                            <img
                              src="/linkedin-icon.svg"
                              alt="LinkedIn"
                              className="w-7 h-7"
                            />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            Generate LinkedIn post
                          </h3>
                          <p className="text-sm text-gray-600">
                            Create engaging content from your materials
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${
                        msg.role === 'user' ? '' : 'space-y-2'
                      }`}>
                        {/* Thinking Section - Only for assistant messages with reasoning */}
                        {msg.role === 'assistant' && msg.thinking && (
                          <div className="mb-2">
                            <button
                              onClick={() => {
                                setChatMessages(prev => prev.map((m, i) => 
                                  i === idx ? { ...m, showThinking: !m.showThinking } : m
                                ));
                              }}
                              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            >
                              <svg 
                                className={`w-3 h-3 transition-transform ${msg.showThinking ? 'rotate-90' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                {msg.showThinking ? 'Hide' : 'View'} Thinking Process
                              </span>
                            </button>
                            {msg.showThinking && (
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start gap-2 mb-2">
                                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                  <span className="text-xs font-semibold text-blue-900">AI Reasoning</span>
                                </div>
                                <div className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed pl-6">
                                  {msg.thinking}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className={`rounded-lg px-4 py-2 overflow-hidden ${
                        msg.role === 'user' 
                          ? 'bg-[#F95B14] text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        <div className="text-sm prose prose-sm max-w-none break-words overflow-wrap-anywhere prose-headings:font-bold prose-headings:text-gray-900 prose-h1:text-base prose-h2:text-base prose-h3:text-sm prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ul:space-y-1 prose-li:my-0.5 prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-xs prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:break-all prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:max-w-full">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            className="break-words"
                            components={{
                              code: ({node, inline, ...props}) => 
                                inline ? 
                                  <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs" style={{wordBreak: 'break-word'}} {...props} /> : 
                                  <code {...props} />,
                              pre: ({node, children, ...props}) => (
                                <div className="my-3 rounded-lg overflow-hidden border border-gray-300">
                                  <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Code</span>
                                    <button
                                      onClick={() => {
                                        const codeText = node?.children?.[0]?.children?.[0]?.value || '';
                                        navigator.clipboard.writeText(codeText);
                                      }}
                                      className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                  <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs" {...props}>{children}</pre>
                                </div>
                              ),
                              h1: ({node, ...props}) => <h1 className="text-base font-bold text-gray-900 mt-3 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 mt-3 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-900 mt-3 mb-2" {...props} />,
                              p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                              ul: ({node, ...props}) => <ul className="my-2 space-y-1.5 list-none pl-0" {...props} />,
                              ol: ({node, ...props}) => <ol className="my-2 space-y-1.5 pl-6 list-decimal" {...props} />,
                              li: ({node, children, ...props}) => {
                                const isOrdered = props.className?.includes('task-list-item') === false;
                                return (
                                  <li className="my-1 flex items-start gap-2" {...props}>
                                    {!isOrdered && <span className="text-orange-500 flex-shrink-0 leading-relaxed mt-0.5">•</span>}
                                    <span className="flex-1 leading-relaxed">{children}</span>
                                  </li>
                                );
                              },
                              strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center justify-between text-xs opacity-70 mt-1">
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          {msg.role === 'assistant' && msg.model && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2">
                              {availableModels.find(m => m.id === msg.model)?.name || msg.model}
                            </span>
                          )}
                        </div>
                        </div>
                        {/* Action buttons for assistant messages */}
                        {msg.role === 'assistant' && (
                          <div className="flex gap-3 mt-2 mb-4">
                            {/* Email Draft Action - Only show if Outlook is connected */}
                            {hasOutlookConnection && (
                              <div className="group relative">
                                <button
                                  onClick={() => addToEmailDrafts(msg.content, selectedEvent?.title, selectedEvent?.attendees)}
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

                {/* Chat Input - Fixed at Bottom */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
                  {/* Model Switch Notification */}
                  {modelSwitchNotification && (
                    <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 flex items-center gap-2 animate-fade-in">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {modelSwitchNotification}
                    </div>
                  )}
                  
                  {/* Model Selector - Custom Dropdown */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1">
                      <label className="text-xs font-medium text-gray-600">AI Model:</label>
                      
                      {/* Custom Dropdown */}
                      <div className="relative flex-1 max-w-md model-dropdown-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowModelDropdown(!showModelDropdown);
                          }}
                          className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {availableModels.find(m => m.id === selectedModel)?.name}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600">
                              {availableModels.find(m => m.id === selectedModel)?.description}
                            </span>
                          </div>
                          <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown Menu - Opens Upward */}
                        {showModelDropdown && (
                          <div className="absolute z-50 bottom-full mb-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            {availableModels.map((model, index) => (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModel(model.id);
                                  setShowModelDropdown(false);
                                  setModelSwitchNotification(`✓ Switched to ${model.name}`);
                                  setTimeout(() => setModelSwitchNotification(''), 3000);
                                  console.log('🔄 Model switched to:', model.id);
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                  selectedModel === model.id ? 'bg-orange-50' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className={`text-sm font-semibold ${
                                        selectedModel === model.id ? 'text-[#F95B14]' : 'text-gray-900'
                                      }`}>
                                        {model.name}
                                      </span>
                                      {selectedModel === model.id && (
                                        <svg className="w-4 h-4 text-[#F95B14]" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {model.description}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {model.provider}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setShowModelInfo(!showModelInfo)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Model information"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">via</span>
                      <span className="text-xs font-semibold text-[#F95B14] bg-orange-50 px-2 py-1 rounded">SambaNova Cloud</span>
                    </div>
                  </div>

                  {/* Model Info Panel */}
                  {showModelInfo && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <div className="font-semibold text-blue-900 mb-2">
                        {availableModels.find(m => m.id === selectedModel)?.name}
                      </div>
                      <div className="text-blue-800 mb-2">
                        {availableModels.find(m => m.id === selectedModel)?.description}
                      </div>
                      <div className="text-blue-700">
                        <strong>Provider:</strong> SambaNova Cloud<br />
                        <strong>Model ID:</strong> <code className="bg-blue-100 px-1 py-0.5 rounded">{selectedModel}</code>
                      </div>
                    </div>
                  )}

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

            {/* Floating Calendar Panel */}
            {showCalendarPanel && (
              <div className="fixed right-4 top-24 w-80 bg-white rounded-xl border border-gray-200 shadow-2xl z-50 calendar-panel max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upcoming Events
                  </h2>
                  <button
                    onClick={() => setShowCalendarPanel(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title="Close calendar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
                  <div className="text-xs text-gray-500">Your upcoming meetings</div>
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

                <div className="p-4 space-y-3 max-h-[640px]" style={{ overflowY: 'auto', overflowX: 'visible' }}>
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
                          {event.description && event.description.trim() && (
                            <p className="text-xs text-gray-500 mt-1 overflow-hidden max-w-full break-words" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as any,
                              textOverflow: 'ellipsis',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word'
                            }}>
                              {event.description.replace(/\.{3,}/g, '...').trim()}
                            </p>
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
            )}
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
                  try {
                    console.log('💾 Saving context...', context);
                    
                    if (!session?.user?.email) {
                      alert('No session found. Please refresh and try again.');
                      return;
                    }

                    // Use NextAuth session - already available in component!
                    console.log('🔑 Using NextAuth session for:', session.user.email);

                    const response = await fetch('/api/user/context', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include', // Include cookies for NextAuth
                      body: JSON.stringify({ userContext: context }),
                    });

                    console.log('📡 Response status:', response.status);
                    const data = await response.json();
                    console.log('📡 Response data:', data);

                    if (response.ok) {
                      alert('✅ Context saved successfully!');
                      if (userData) {
                        setUserData({ ...userData, user_context: context });
                      }
                    } else {
                      alert(`❌ Error saving: ${data.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    console.error('❌ Error saving context:', error);
                    alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                
                {/* Upload Message */}
                {uploadMessage && (
                  <div className={`mt-4 p-3 rounded-lg border ${
                    uploadMessageType === 'success' 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">{uploadMessage}</p>
                  </div>
                )}
                
                {/* My Permissions (if available) */}
                {userPermissions && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 Your Permissions</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center">
                        <span className={userPermissions.can_upload_materials ? 'text-green-600' : 'text-gray-400'}>
                          {userPermissions.can_upload_materials ? '✓' : '✗'}
                        </span>
                        <span className="ml-1">Upload materials</span>
                      </div>
                      <div className="flex items-center">
                        <span className={userPermissions.can_share_materials ? 'text-green-600' : 'text-gray-400'}>
                          {userPermissions.can_share_materials ? '✓' : '✗'}
                        </span>
                        <span className="ml-1">Share materials</span>
                      </div>
                      <div className="flex items-center">
                        <span className={userPermissions.can_view_org_materials ? 'text-green-600' : 'text-gray-400'}>
                          {userPermissions.can_view_org_materials ? '✓' : '✗'}
                        </span>
                        <span className="ml-1">View team materials</span>
                      </div>
                      <div className="flex items-center">
                        <span className={userPermissions.can_delete_own_materials ? 'text-green-600' : 'text-gray-400'}>
                          {userPermissions.can_delete_own_materials ? '✓' : '✗'}
                        </span>
                        <span className="ml-1">Delete own materials</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Uploaded files list */}
                <div className="mt-4 space-y-4">
                  {/* My Materials */}
                  {salesMaterials.filter(m => m.is_owner).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        📁 My Materials ({salesMaterials.filter(m => m.is_owner).length})
                      </h4>
                      <div className="space-y-2">
                        {salesMaterials.filter(m => m.is_owner).map((material) => (
                          <div key={material.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-gray-900">{material.file_name}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    material.visibility === 'organization' ? 'bg-green-100 text-green-700' :
                                    material.visibility === 'team' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {material.visibility === 'organization' ? '🌐 Org' :
                                     material.visibility === 'team' ? '👥 Team' :
                                     '🔒 Private'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {material.category} • {(material.file_size / 1024).toFixed(1)} KB • {new Date(material.created_at).toLocaleDateString()}
                                </p>
                                {material.shared_at && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Shared {new Date(material.shared_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {/* Share dropdown */}
                                {material.can_share && userPermissions?.can_share_materials && (
                                  <div className="relative group">
                                    <button className="text-blue-600 hover:text-blue-800 transition-colors text-sm">
                                      🔄
                                    </button>
                                    <div className="hidden group-hover:block absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                      <button
                                        onClick={() => shareMaterial(material.id, 'private')}
                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                      >
                                        🔒 Make Private
                                      </button>
                                      <button
                                        onClick={() => shareMaterial(material.id, 'organization')}
                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                      >
                                        🌐 Share with Organization
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {/* Delete button */}
                                {material.can_delete && (
                                  <button
                                    onClick={() => deleteMaterial(material.id)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Materials */}
                  {salesMaterials.filter(m => !m.is_owner).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        👥 Team Materials ({salesMaterials.filter(m => !m.is_owner).length})
                      </h4>
                      <div className="space-y-2">
                        {salesMaterials.filter(m => !m.is_owner).map((material) => (
                          <div key={material.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-gray-900">{material.file_name}</p>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                                    {material.visibility === 'organization' ? '🌐 Shared' : '👥 Team'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {material.category} • {(material.file_size / 1024).toFixed(1)} KB
                                </p>
                                {material.owner && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    By: {material.owner.full_name || material.owner.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {salesMaterials.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No materials uploaded yet. Upload your first sales material above!
                    </p>
                  )}
                </div>
              </div>

              {/* Team Management Section - Always Show */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">👥 Team Collaboration</h3>
                  {isAdmin && (
                    <button
                      onClick={() => router.push('/admin/organization')}
                      className="text-xs bg-[#667eea] text-white px-3 py-1.5 rounded-lg hover:bg-[#5568d3] transition-colors font-medium"
                    >
                      Admin Dashboard →
                    </button>
                  )}
                </div>
                
                {isAdmin ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Invite team members and manage your organization.
                    </p>
                    
                    {/* Invitation Form */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">📨 Invite Team Member</h4>
                      
                      {inviteMessage && (
                        <div className={`mb-3 p-3 rounded-lg text-xs font-medium ${
                          inviteMessage.startsWith('✅') 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          <div className="whitespace-pre-wrap">{inviteMessage}</div>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="teammate@company.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            disabled={inviteLoading}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                          <select 
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value as 'member' | 'org_admin')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                            disabled={inviteLoading}
                          >
                            <option value="member">Team Member (Standard Access)</option>
                            <option value="org_admin">Admin (Full Access)</option>
                          </select>
                        </div>
                        
                        <button
                          onClick={handleSendInvitation}
                          disabled={inviteLoading || !inviteEmail}
                          className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {inviteLoading ? 'Sending...' : '✉️ Send Invitation'}
                        </button>
                        
                        <p className="text-xs text-blue-700 italic">
                          They'll get an invitation link to join your organization.
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-[#667eea]">
                          {salesMaterials.filter(m => m.visibility === 'organization').length}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Shared Materials</div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-[#667eea]">
                          {salesMaterials.filter(m => !m.is_owner).length}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Team Materials</div>
                      </div>
                    </div>

                    {/* Link to Full Dashboard */}
                    <button
                      onClick={() => router.push('/admin/organization')}
                      className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>View Full Organization Dashboard</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div>
                    {userData?.organization_id ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">
                          You're part of a team! Share your sales materials and collaborate with teammates.
                        </p>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">💡 Team Features:</h4>
                          <ul className="text-xs text-gray-600 space-y-1.5">
                            <li>• Share your materials with the team using the 🔄 button above</li>
                            <li>• Access materials shared by your teammates</li>
                            <li>• Collaborate on sales strategies and insights</li>
                          </ul>
                          <p className="text-xs text-gray-500 mt-3 italic">
                            Need to invite someone? Contact your organization admin.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">
                          Individual account - Upgrade to enable team collaboration features.
                        </p>
                        <button
                          onClick={() => {
                            window.location.href = `mailto:hello@curiosityengine.io?subject=Upgrade to Organization Account&body=Hi,%0A%0AI would like to upgrade to an Organization account to enable team features.%0A%0AName: ${userData?.full_name}%0AEmail: ${userData?.email}%0A%0APlease send me more information.%0A%0AThanks!`;
                          }}
                          className="w-full bg-[#F95B14] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                        >
                          📧 Request Organization Upgrade
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upgrade Section */}
              {!isAdmin && (
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
              )}
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

