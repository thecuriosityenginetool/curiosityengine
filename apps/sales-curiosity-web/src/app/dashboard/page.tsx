'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ProfileTab from '@/components/Settings/ProfileTab';
import TeamTab from '@/components/Settings/TeamTab';
import KnowledgeTab from '@/components/Settings/KnowledgeTab';
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
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'team' | 'knowledge'>('profile');
  
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
  const [selectedModel, setSelectedModel] = useState('auto');
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [modelSwitchNotification, setModelSwitchNotification] = useState('');
  const [showConversations, setShowConversations] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  // Available models from SambaNova Cloud (only models that support tool/function calling)
  // Model IDs must match SambaNova Cloud exactly
  const availableModels = [
    { id: 'auto', name: '🤖 Auto (Recommended)', provider: 'SambaNova', description: 'Smart model selection based on task' },
    { id: 'DeepSeek-R1-0528', name: 'DeepSeek R1 (671B)', provider: 'SambaNova', description: 'Most powerful - Best for complex reasoning' },
    { id: 'Meta-Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', provider: 'SambaNova', description: 'Fast & reliable - Best for tool use' },
    { id: 'DeepSeek-V3-0324', name: 'DeepSeek V3', provider: 'SambaNova', description: 'Powerful general-purpose model' },
    { id: 'DeepSeek-V3.1', name: 'DeepSeek V3.1', provider: 'SambaNova', description: 'Latest DeepSeek version' },
    { id: 'Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', provider: 'SambaNova', description: 'Ultra-fast - Simple tasks' },
  ];
  
  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
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
  const [hasGmailConnection, setHasGmailConnection] = useState(false);
  const [hasSalesforceConnection, setHasSalesforceConnection] = useState(false);
  const [hasMondayConnection, setHasMondayConnection] = useState(false);
  const [connectedEmailProvider, setConnectedEmailProvider] = useState<'google' | 'microsoft' | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  
  // Integration help modal state
  const [showIntegrationHelp, setShowIntegrationHelp] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<'salesforce' | 'gmail' | 'outlook' | 'linkedin' | 'hubspot' | null>(null);
  const [salesforceHelpTab, setSalesforceHelpTab] = useState<'tools' | 'user' | 'org'>('tools');
  
  // Salesforce credentials state
  const [sfClientId, setSfClientId] = useState('');
  const [sfClientSecret, setSfClientSecret] = useState('');
  const [sfCredentialsSaved, setSfCredentialsSaved] = useState(false);
  const [sfCredentialsLoading, setSfCredentialsLoading] = useState(false);
  const [sfCredentialsMessage, setSfCredentialsMessage] = useState('');
  const [showSfSecret, setShowSfSecret] = useState(false);
  
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
      
      // Check for URL parameters from extension or OAuth redirects
      const params = new URLSearchParams(window.location.search);
      
      // Handle OAuth success/error messages
      const successMessage = params.get('success');
      const errorMessage = params.get('error');
      const tabParam = params.get('tab');
      
      if (successMessage) {
        console.log('✅ OAuth Success:', successMessage);
        // Show success message briefly
        setTimeout(() => {
          // Refresh connections after OAuth success
          if (user) {
            checkConnections();
          }
        }, 500);
        
        // Switch to integrations tab if specified
        if (tabParam === 'integrations') {
          setActiveTab('integrations');
        }
      }
      
      if (errorMessage) {
        console.error('❌ OAuth Error:', errorMessage);
      }
      
      // Check for extension chat opening
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
  }, [status, session, user]);

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
      // Refresh connections when viewing integrations tab
      checkConnections();
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

  // Check Salesforce credentials when showing org tab
  useEffect(() => {
    if (showIntegrationHelp && selectedIntegration === 'salesforce' && salesforceHelpTab === 'org' && user) {
      checkSalesforceCredentials();
    }
  }, [showIntegrationHelp, selectedIntegration, salesforceHelpTab, user]);

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
      console.log('📤 Fetch URL:', '/api/chat');
      console.log('📤 Payload:', { 
        messageLength: messageContent.length,
        historyLength: chatMessages.length,
        model: selectedModel
      });
      
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

      console.log('📥 Response received:', response.status, response.ok);

      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let thinkingContent = '';
      let finalContent = '';
      let agentSteps = ''; // Track agent steps for thinking display
      let inThinkingTag = false;

      console.log('📖 Starting to read stream...', reader ? 'Reader available' : 'No reader!');

      if (reader) {
        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          chunkCount++;
          
          console.log(`📦 Chunk ${chunkCount}:`, done ? 'Stream done' : `${value?.length || 0} bytes`);
          
          if (done) {
            console.log('✅ Stream finished after', chunkCount, 'chunks');
            break;
          }

          const chunk = decoder.decode(value);
          console.log(`📝 Decoded chunk ${chunkCount}:`, chunk.substring(0, 100));
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              console.log('📨 Parsing SSE data:', data.substring(0, 100));
              try {
                const parsed = JSON.parse(data);
                console.log('✅ Parsed event type:', parsed.type);

                if (parsed.type === 'context_loaded') {
                  // Add context sources to agent steps
                  if (parsed.sources && parsed.sources.length > 0) {
                    agentSteps += '📊 **Context Loaded:**\n';
                    parsed.sources.forEach((source: string) => {
                      agentSteps += `  ✓ ${source}\n`;
                    });
                    agentSteps += '\n';
                  }
                } else if (parsed.type === 'thinking') {
                  // Handle thinking content from LangGraph/DeepSeek-R1
                  if (parsed.content) {
                    agentSteps += '\n**AI Reasoning:**\n' + parsed.content + '\n';
                    console.log('🧠 Received thinking content');
                  }
                } else if (parsed.type === 'content') {
                  accumulatedContent += parsed.content;
                  
                  // Parse thinking tags from DeepSeek-R1 response
                  const { thinking, final } = parseThinkingTags(accumulatedContent);
                  
                  // Combine AI reasoning with agent steps
                  const fullThinking = agentSteps + (agentSteps && thinking ? '\n---\n\n**AI Reasoning:**\n' + thinking : thinking);
                  
                  // Update the assistant message in real-time
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    newMessages[newMessages.length - 1] = {
                      ...lastMessage,
                      content: final,
                      thinking: fullThinking,
                      // Collapse thinking as soon as any real content starts (more than just whitespace)
                      showThinking: final.trim().length === 0 ? lastMessage.showThinking : false,
                      model: selectedModel // Track which model generated this
                    };
                    return newMessages;
                  });
                } else if (parsed.type === 'tool_start') {
                  // Add to agent steps for thinking display
                  const toolName = parsed.tool.replace(/_/g, ' ');
                  const timestamp = new Date().toLocaleTimeString();
                  agentSteps += `\n🔧 [${timestamp}] Calling tool: ${toolName}`;
                  
                  // Show detailed indicator with icon
                  const toolIcon = parsed.tool === 'search_salesforce' ? '🔍' :
                    parsed.tool === 'search_emails' || parsed.tool === 'search_gmail_emails' ? '📧' :
                    parsed.tool === 'create_lead' || parsed.tool === 'create_contact' ? '✏️' :
                    parsed.tool === 'update_record' ? '📝' :
                    parsed.tool === 'create_task' ? '✅' :
                    parsed.tool === 'get_activity' ? '📊' :
                    parsed.tool === 'add_note' ? '📌' :
                    parsed.tool === 'web_search' ? '🌐' :
                    parsed.tool === 'browse_url' ? '🔗' :
                    parsed.tool === 'create_gmail_draft' || parsed.tool === 'create_email_draft' ? '✉️' :
                    parsed.tool === 'create_calendar_event' || parsed.tool === 'create_google_calendar_event' ? '📅' : '⚙️';
                  
                  // Don't add to accumulated content, will show in thinking section
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: accumulatedContent,
                      thinking: agentSteps,
                      showThinking: true // Auto-expand thinking during tool execution
                    };
                    return newMessages;
                  });
                } else if (parsed.type === 'tool_result') {
                  // Add tool result to agent steps
                  const resultPreview = parsed.result?.substring(0, 150) || 'Result received';
                  agentSteps += `\n✅ Complete: ${resultPreview}${parsed.result?.length > 150 ? '...' : ''}`;
                  
                  // Keep thinking visible until content starts streaming
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: accumulatedContent,
                      thinking: agentSteps,
                      showThinking: true // Keep showing until response starts
                    };
                    return newMessages;
                  });
                } else if (parsed.type === 'done') {
                  // Force collapse thinking display and remove animation when done
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessageIdx = newMessages.length - 1;
                    if (newMessages[lastMessageIdx]?.role === 'assistant') {
                      // Get current content and thinking
                      const currentMsg = newMessages[lastMessageIdx];
                      const { thinking: parsedThinking, final: parsedFinal } = parseThinkingTags(accumulatedContent || currentMsg.content);
                      const fullThinking = agentSteps + (agentSteps && parsedThinking ? '\n---\n\n**AI Reasoning:**\n' + parsedThinking : parsedThinking);
                      
                      newMessages[lastMessageIdx] = {
                        ...currentMsg,
                        content: parsedFinal || currentMsg.content,
                        thinking: fullThinking || currentMsg.thinking,
                        showThinking: false // Force collapse on completion
                      };
                    }
                    return newMessages;
                  });
                  
                  // Save final assistant message with parsed thinking
                  if (currentChatId && accumulatedContent) {
                    const { thinking, final } = parseThinkingTags(accumulatedContent);
                    // Combine agent steps with AI reasoning for full thinking context
                    const fullThinking = agentSteps + (agentSteps && thinking ? '\n---\n\n**AI Reasoning:**\n' + thinking : thinking);
                    
                    await fetch(`/api/chats/${currentChatId}/messages`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        role: 'assistant',
                        content: final,
                        thinking: fullThinking,
                        model: selectedModel
                      }),
                    });
                    console.log('💾 Saved assistant message to chat:', currentChatId);
                    
                    // Reload chat history to ensure saved messages appear in sidebar
                    loadChatHistory();
                  }
                } else if (parsed.type === 'error') {
                  accumulatedContent += `\n\n❌ Error: ${parsed.error}`;
                  setChatMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: accumulatedContent,
                      showThinking: false // Collapse thinking on error
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
      // Update the assistant message with error and collapse thinking
      setChatMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1]?.role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: `❌ Sorry, there was an error processing your message. Please try again.`,
            showThinking: false // Collapse thinking on error
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
    // Smart connection: org admins connect at org-level, others at user-level
    const isOrgAdmin = userData?.role === 'org_admin' || userData?.role === 'super_admin';
    
    if (isOrgAdmin) {
      console.log('🟣 Admin user detected - connecting at organization level');
      connectSalesforceOrg();
    } else {
      console.log('🟣 Regular user - connecting at user level');
      connectSalesforce();
    }
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
        setConnectedEmailProvider(null);
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

  async function disconnectGoogle() {
    try {
      const response = await fetch('/api/gmail/disconnect', {
        method: 'POST',
      });
      if (response.ok) {
        setHasGmailConnection(false);
        setConnectedEmailProvider(null);
        alert('✅ Google Workspace disconnected successfully');
        await createActivityLog('gmail_disconnected', 'Google Workspace Disconnected', 'Gmail and Google Calendar integration disconnected');
      } else {
        alert('❌ Failed to disconnect Google Workspace');
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      alert('❌ Error disconnecting Google Workspace');
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

  async function connectToMonday() {
    try {
      console.log('🟣 [Monday Connect] Initiating OAuth...');
      const response = await fetch('/api/monday/auth-user');
      
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          console.log('🟣 [Monday Connect] Redirecting to Monday.com OAuth...');
          window.location.href = data.authUrl;
        } else if (data.connected) {
          console.log('✅ [Monday Connect] Already connected');
          setHasMondayConnection(true);
          alert('✅ Monday.com is already connected!');
        }
      } else {
        const error = await response.json();
        console.error('❌ [Monday Connect] Failed:', error);
        alert(`❌ Failed to connect Monday.com: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [Monday Connect] Exception:', error);
      alert(`❌ Error connecting Monday.com: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function disconnectMonday() {
    if (!confirm('Are you sure you want to disconnect Monday.com?')) {
      return;
    }
    
    try {
      console.log('🟣 [Monday Disconnect] Disconnecting...');
      const response = await fetch('/api/monday/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        setHasMondayConnection(false);
        alert('✅ Monday.com disconnected successfully');
        await createActivityLog('monday_disconnected', 'Monday.com Disconnected', 'Monday.com integration disconnected');
      } else {
        alert('❌ Failed to disconnect Monday.com');
      }
    } catch (error) {
      console.error('❌ [Monday Disconnect] Error:', error);
      alert('❌ Error disconnecting Monday.com');
    }
  }

  async function connectToGoogle() {
    try {
      console.log('🟩 [Connect Google] Step 1: Starting connection flow...');
      console.log('🟩 [Connect Google] Step 2: Fetching /api/gmail/auth-user...');
      
      const response = await fetch('/api/gmail/auth-user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🟩 [Connect Google] Step 3: Response received. Status:', response.status);
      console.log('🟩 [Connect Google] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('🟩 [Connect Google] Step 4: Response data:', data);
        
        if (data.authUrl) {
          console.log('🟩 [Connect Google] Step 5: Got authUrl, redirecting...');
          console.log('🟩 [Connect Google] Auth URL:', data.authUrl);
          console.log('🟩 [Connect Google] Step 6: Setting window.location.href...');
          window.location.href = data.authUrl;
          console.log('🟩 [Connect Google] Step 7: Redirect initiated (this may not log)');
        } else if (data.connected) {
          console.log('✅ [Connect Google] Already connected!');
          alert('Google Workspace is already connected!');
          await checkConnections(); // Refresh status
        } else {
          console.error('❌ [Connect Google] No authUrl in response:', data);
          alert('Failed to get Google authorization URL. Check console for details.');
        }
      } else {
        console.error('❌ [Connect Google] Response not OK. Status:', response.status);
        const errorData = await response.text();
        console.error('❌ [Connect Google] Error response:', errorData);
        
        try {
          const errorJson = JSON.parse(errorData);
          alert(`Error: ${errorJson.error || 'Unknown error connecting to Google'}`);
        } catch {
          alert(`Error connecting to Google (Status: ${response.status}). Check console for details.`);
        }
      }
    } catch (error) {
      console.error('❌ [Connect Google] Fatal exception:', error);
      alert(`Error connecting to Google: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      console.log('🔍 [Dashboard] Checking all integrations...');
      
      // Use comprehensive status endpoint
      const statusResponse = await fetch('/api/integrations/status');
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('✅ [Dashboard] Integration status received:', status);
        
        // Update Gmail connection
        const gmailConnected = status.gmail?.connected === true;
        console.log('🔍 [Dashboard] Gmail:', { 
          connected: gmailConnected,
          enabled: status.gmail?.enabled,
          hasTokens: status.gmail?.hasUserTokens
        });
        setHasGmailConnection(gmailConnected);
        
        // Update Outlook connection
        const outlookConnected = status.outlook?.connected === true;
        console.log('🔍 [Dashboard] Outlook:', { 
          connected: outlookConnected,
          enabled: status.outlook?.enabled,
          hasTokens: status.outlook?.hasUserTokens
        });
        setHasOutlookConnection(outlookConnected);
        
        // Update Salesforce connection
        const salesforceConnected = status.salesforce?.connected === true;
        console.log('🔍 [Dashboard] Salesforce:', { 
          connected: salesforceConnected,
          enabled: status.salesforce?.enabled,
          hasTokens: status.salesforce?.hasUserTokens
        });
        setHasSalesforceConnection(salesforceConnected);
        
        // Update Monday.com connection
        const mondayConnected = status.monday?.connected === true;
        console.log('🔍 [Dashboard] Monday.com:', { 
          connected: mondayConnected,
          enabled: status.monday?.enabled,
          hasTokens: status.monday?.hasUserTokens
        });
        setHasMondayConnection(mondayConnected);
        
        // Set email provider
        const emailProvider = status.emailProvider;
        console.log('🔍 [Dashboard] Email provider:', emailProvider);
        setConnectedEmailProvider(emailProvider);
        
      } else {
        console.error('❌ [Dashboard] Status endpoint failed:', statusResponse.status);
        const errorText = await statusResponse.text();
        console.error('❌ [Dashboard] Error response:', errorText);
        
        // Fall back to individual checks if comprehensive endpoint fails
        console.log('⚠️ [Dashboard] Falling back to individual status checks...');
        await checkConnectionsIndividually();
      }
    } catch (error) {
      console.error('❌ [Dashboard] Fatal error checking connections:', error);
      // Fall back to individual checks
      await checkConnectionsIndividually();
    }
  }

  async function checkConnectionsIndividually() {
    try {
      let outlookConnected = false;
      let gmailConnected = false;

      // Check Outlook
      try {
        const outlookResponse = await fetch('/api/outlook/status');
        if (outlookResponse.ok) {
          const outlookData = await outlookResponse.json();
          outlookConnected = Boolean(outlookData.connected);
          setHasOutlookConnection(outlookConnected);
        }
      } catch (e) {
        console.error('❌ Outlook check failed:', e);
        setHasOutlookConnection(false);
      }

      // Check Gmail
      try {
        const gmailResponse = await fetch('/api/gmail/status');
        if (gmailResponse.ok) {
          const gmailData = await gmailResponse.json();
          gmailConnected = Boolean(gmailData.connected);
          setHasGmailConnection(gmailConnected);
        }
      } catch (e) {
        console.error('❌ Gmail check failed:', e);
        setHasGmailConnection(false);
      }

      // Check Salesforce
      try {
        const sfResponse = await fetch('/api/salesforce/auth-user');
        if (sfResponse.ok) {
          const sfData = await sfResponse.json();
          const isConnected = sfData.connected === true;
          setHasSalesforceConnection(isConnected);
        }
      } catch (e) {
        console.error('❌ Salesforce check failed:', e);
        setHasSalesforceConnection(false);
      }

      // Set email provider
      if (outlookConnected) {
        setConnectedEmailProvider('microsoft');
      } else if (gmailConnected) {
        setConnectedEmailProvider('google');
      } else {
        setConnectedEmailProvider(null);
      }
    } catch (error) {
      console.error('❌ Individual checks failed:', error);
      setHasSalesforceConnection(false);
      setHasOutlookConnection(false);
      setHasGmailConnection(false);
      setConnectedEmailProvider(null);
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

  // Check Salesforce credentials status
  async function checkSalesforceCredentials() {
    try {
      const response = await fetch('/api/salesforce/credentials');
      if (response.ok) {
        const data = await response.json();
        setSfCredentialsSaved(data.hasCredentials || false);
        return data.hasCredentials;
      }
    } catch (error) {
      console.error('Error checking Salesforce credentials:', error);
    }
    return false;
  }

  // Save Salesforce credentials
  async function saveSalesforceCredentials() {
    if (!sfClientId || !sfClientSecret) {
      setSfCredentialsMessage('Please enter both Consumer Key and Consumer Secret');
      return;
    }

    setSfCredentialsLoading(true);
    setSfCredentialsMessage('');

    try {
      const response = await fetch('/api/salesforce/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          clientId: sfClientId,
          clientSecret: sfClientSecret,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSfCredentialsSaved(true);
        setSfCredentialsMessage('✅ Credentials saved! You can now click "Connect Salesforce" below.');
        // Clear form
        setSfClientId('');
        setSfClientSecret('');
        setShowSfSecret(false);
      } else {
        const errorData = await response.json();
        setSfCredentialsMessage('❌ ' + (errorData.error || 'Failed to save credentials'));
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
      setSfCredentialsMessage('❌ Error saving credentials. Please try again.');
    } finally {
      setSfCredentialsLoading(false);
    }
  }

  // Reset Salesforce credentials and connection
  async function resetSalesforceConnection() {
    if (!confirm('This will remove your Salesforce credentials and disconnect the integration. You will need to re-enter credentials and reconnect. Continue?')) {
      return;
    }

    setSfCredentialsLoading(true);

    try {
      const response = await fetch('/api/salesforce/credentials', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSfCredentialsSaved(false);
        setSfClientId('');
        setSfClientSecret('');
        setShowSfSecret(false);
        setSfCredentialsMessage('✅ Connection reset. You can now enter new credentials.');
        setHasSalesforceConnection(false);
        // Refresh connections
        await checkConnections();
      } else {
        const errorData = await response.json();
        setSfCredentialsMessage('❌ ' + (errorData.error || 'Failed to reset connection'));
      }
    } catch (error) {
      console.error('Error resetting connection:', error);
      setSfCredentialsMessage('❌ Error resetting connection. Please try again.');
    } finally {
      setSfCredentialsLoading(false);
    }
  }

  // Organization-level Salesforce connection (for org admins)
  async function connectSalesforceOrg() {
    try {
      console.log('🟣 Connecting organization-level Salesforce...');
      
      const response = await fetch('/api/salesforce/auth', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.authUrl) {
          console.log('🟣 Redirecting to Salesforce authorization...');
          window.location.href = data.authUrl;
        } else {
          console.error('❌ No authUrl in response:', data);
          alert('Failed to get Salesforce authorization URL.');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Salesforce auth error:', errorData);
        
        if (errorData.needsCredentials) {
          alert('Please enter your Salesforce Consumer Key and Consumer Secret first (scroll up in the "Connect Org" tab).');
        } else {
          alert(errorData.error || 'Failed to initiate Salesforce connection.');
        }
      }
    } catch (error) {
      console.error('❌ Exception connecting to Salesforce:', error);
      alert('Error connecting to Salesforce. Please try again.');
    }
  }

  // User-level Salesforce connection (for individual users)
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
        <div className="relative w-24 h-24">
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-gray-200"></div>
          <div className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-transparent border-t-[#F95B14] animate-spin"></div>
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
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium inline-flex items-center gap-1">
                              {userData.role === 'org_admin' ? (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                  </svg>
                                  Admin
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                  </svg>
                                  Member
                                </>
                              )}
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
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
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
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Admin</div>
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
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
                { id: 'dashboard', label: 'Agent', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>) },
                { id: 'leads', label: 'Leads', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>) },
                { id: 'context', label: 'Admin', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>) },
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
                            if (!hasOutlookConnection) {
                              setChatInput("I want to check my calendar but I haven't connected Outlook yet. Can you explain what calendar features are available and guide me to set it up?");
                              setTimeout(() => sendChatMessage(), 100);
                            } else {
                              setChatInput("What meetings do I have coming up on my calendar?");
                              setTimeout(() => sendChatMessage(), 100);
                            }
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
                            if (!hasSalesforceConnection) {
                              setChatInput("I want to research my leads but I haven't connected Salesforce yet. Can you explain what CRM features are available and guide me to set it up?");
                              setTimeout(() => sendChatMessage(), 100);
                            } else {
                              setChatInput("Research my late stage leads and give me insights on next steps");
                              setTimeout(() => sendChatMessage(), 100);
                            }
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

                        {/* Email Prompt - Dynamic based on connected provider */}
                        <button
                          onClick={() => {
                            if (!hasGmailConnection && !hasOutlookConnection) {
                              setChatInput("I want to draft an email but I haven't connected Gmail or Outlook yet. Can you explain what email features are available and guide me to set up an email integration?");
                              setTimeout(() => sendChatMessage(), 100);
                            } else {
                              const provider = hasGmailConnection ? "Gmail" : "Outlook";
                              setChatInput(`Help me draft a follow-up email to my latest prospect using ${provider}`);
                              setTimeout(() => sendChatMessage(), 100);
                            }
                          }}
                          className="group p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {/* Show Gmail icon if connected */}
                              {hasGmailConnection && (
                                <img
                                  src="/gmail-icon.svg"
                                  alt="Gmail"
                                  className="w-7 h-7"
                                />
                              )}
                              {/* Show Outlook icon if connected */}
                              {hasOutlookConnection && (
                                <img
                                  src="/Outlook_icon.svg"
                                  alt="Outlook"
                                  className="w-7 h-7"
                                />
                              )}
                              {/* Show both if neither connected */}
                              {!hasGmailConnection && !hasOutlookConnection && (
                                <>
                                  <img src="/gmail-icon.svg" alt="Gmail" className="w-7 h-7 opacity-40" />
                                  <img src="/Outlook_icon.svg" alt="Outlook" className="w-7 h-7 opacity-40" />
                                </>
                              )}
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
                        {/* Thinking Section - Show AI processing steps */}
                        {msg.role === 'assistant' && msg.thinking && (
                          <div className="mb-3">
                            {msg.showThinking && (
                              <div className="mb-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-5 h-5 bg-purple-500 rounded-full">
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                      </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-purple-900">Thinking Summary</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setChatMessages(prev => prev.map((m, i) => 
                                        i === idx ? { ...m, showThinking: false } : m
                                      ));
                                    }}
                                    className="text-purple-600 hover:text-purple-900 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                <div className="text-xs text-purple-800 leading-relaxed space-y-2">
                                  {msg.thinking.split('\n').filter(line => line.trim()).map((line, i) => {
                                    // Convert technical logs to natural language
                                    const naturalLine = line
                                      .replace(/🔧.*Calling tool: web search/i, '🔍 Searching the web for current information...')
                                      .replace(/🔧.*Calling tool: search_gmail_emails/i, '📧 Looking through your Gmail for relevant emails...')
                                      .replace(/🔧.*Calling tool: search_salesforce/i, '🔍 Searching Salesforce CRM for contacts...')
                                      .replace(/🔧.*Calling tool: create_gmail_draft/i, '✉️ Creating email draft in Gmail...')
                                      .replace(/🔧.*Calling tool: create_email_draft/i, '✉️ Creating email draft in Outlook...')
                                      .replace(/🔧.*Calling tool: create_google_calendar_event/i, '📅 Adding event to your Google Calendar...')
                                      .replace(/🔧.*Calling tool: create_calendar_event/i, '📅 Adding event to your Outlook Calendar...')
                                      .replace(/🔧.*Calling tool: browse_url/i, '🌐 Visiting webpage to extract information...')
                                      .replace(/✅ Complete:.*Found (\d+) results/i, '✅ Found $1 relevant results')
                                      .replace(/✅ Complete:.*Error/i, '⚠️ Encountered an issue, adjusting approach...')
                                      .replace(/✅ Tool result:/i, '✅ Retrieved information:');
                                    
                                    return <div key={i} className="pl-2">{naturalLine}</div>;
                                  })}
                                </div>
                              </div>
                            )}
                            {!msg.showThinking && (
                              <button
                                onClick={() => {
                                  setChatMessages(prev => prev.map((m, i) => 
                                    i === idx ? { ...m, showThinking: !m.showThinking } : m
                                  ));
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-full font-medium transition-all hover:shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                View Thinking Summary
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
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
                                <div className="my-3 rounded-lg overflow-hidden border border-gray-300 max-w-full">
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
                                  <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-xs max-w-full" style={{margin: 0}} {...props}>{children}</pre>
                                </div>
                              ),
                              h1: ({node, ...props}) => <h1 className="text-base font-bold text-gray-900 mt-3 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-bold text-gray-900 mt-3 mb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-bold text-gray-900 mt-3 mb-2" {...props} />,
                              p: ({node, ...props}) => <p className="my-2 leading-relaxed" {...props} />,
                              ul: ({node, ...props}) => <ul className="my-2 space-y-1.5 list-none pl-0" {...props} />,
                              ol: ({node, ...props}) => <ol className="my-2 space-y-1.5 pl-6 list-decimal" {...props} />,
                              a: ({node, href, children, ...props}) => (
                                <a 
                                  href={href} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors font-medium break-all"
                                  {...props}
                                >
                                  {children}
                                </a>
                              ),
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
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Sync
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 space-y-3 max-h-[640px]" style={{ overflowY: 'auto', overflowX: 'visible' }}>
                  {calendarEvents.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                      </svg>
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
                              minute: '2-digit',
                              hour12: true,
                              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
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
          <div className="flex h-[calc(100vh-120px)] bg-gray-50">
            {/* Left Sidebar Navigation */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Admin</h2>
              </div>

              <nav className="flex-1 p-4 space-y-1">
                {/* Profile Section */}
                <button
                  onClick={() => setSettingsSubTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
                    settingsSubTab === 'profile'
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profile</span>
                </button>

                {isAdmin && (
                  <>
                    {/* Organization Settings Header */}
                    <div className="pt-6 pb-2 px-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Organization
                      </h3>
                  </div>

                    {/* Team Management */}
                  <button
                      onClick={() => setSettingsSubTab('team')}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
                        settingsSubTab === 'team'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Users</span>
                  </button>

                    {/* Knowledge Base */}
                    <button
                      onClick={() => setSettingsSubTab('knowledge')}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
                        settingsSubTab === 'knowledge'
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>Knowledge</span>
                    </button>
                  </>
                )}
              </nav>
              </div>

            {/* Right Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-8">
                {/* Profile Tab */}
                {settingsSubTab === 'profile' && (
                  <ProfileTab
                    profileData={profileData}
                    userContext={userData?.user_context || { aboutMe: '', objectives: '' }}
                    onSaveProfile={saveProfileData}
                    onSaveContext={async (context) => {
                  try {
                    console.log('💾 Saving context...', context);
                    
                    if (!session?.user?.email) {
                      alert('No session found. Please refresh and try again.');
                      return;
                    }

                    console.log('🔑 Using NextAuth session for:', session.user.email);

                    const response = await fetch('/api/user/context', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                          credentials: 'include',
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
                )}

                {/* Team Tab */}
                {settingsSubTab === 'team' && isAdmin && (
                  <TeamTab
                    organizationId={userData?.organization_id || ''}
                  />
                )}

                {/* Knowledge Tab */}
                {settingsSubTab === 'knowledge' && isAdmin && (
                  <KnowledgeTab
                    materials={salesMaterials}
                    onFileUpload={handleFileUpload}
                    onDeleteMaterial={deleteMaterial}
                    uploadingFile={uploadingFile}
                    uploadMessage={uploadMessage}
                    uploadMessageType={uploadMessageType}
                  />
                    )}
                  </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Modern Header */}
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Connectors</h1>
                  <p className="text-gray-600 mt-1">Integrate with your sales stack</p>
                </div>
              </div>
              <p className="text-gray-500 max-w-3xl">
                Connect your CRM, email, and calendar tools. Our AI agents will automatically sync data, create drafts, and schedule meetings across all your platforms.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Salesforce */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all hover:border-gray-300 relative group">
                <button
                  onClick={() => {
                    setSalesforceHelpTab('tools');
                    setSelectedIntegration('salesforce');
                    setShowIntegrationHelp(true);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-100 flex items-center justify-center transition-colors group/help"
                  title="View documentation"
                >
                  <svg className="w-4 h-4 text-gray-500 group-hover/help:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </button>
                
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <Image 
                      src="/salesforcelogo.svg" 
                      alt="Salesforce" 
                      width={40}
                      height={40}
                      className="w-10 h-10"
                    />
                    <div className="flex-1">
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
              <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all hover:border-gray-300 relative group">
                <button
                  onClick={() => {
                    setSelectedIntegration('linkedin');
                    setShowIntegrationHelp(true);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-100 flex items-center justify-center transition-colors group/help z-10"
                  title="View documentation"
                >
                  <svg className="w-4 h-4 text-gray-500 group-hover/help:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </button>
                
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
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

              {/* Google Workspace (Gmail + Calendar) */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all hover:border-gray-300 relative group">
                <button
                  onClick={() => {
                    setSelectedIntegration('gmail');
                    setShowIntegrationHelp(true);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-100 flex items-center justify-center transition-colors group/help z-10"
                  title="View documentation"
                >
                  <svg className="w-4 h-4 text-gray-500 group-hover/help:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </button>
                
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <Image 
                      src="/Gmail Icon.svg" 
                      alt="Google Workspace" 
                      width={40}
                      height={40}
                      className="w-10 h-10"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-black">Google Workspace</h3>
                      <p className="text-sm text-gray-600">Gmail & Calendar</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-gray-700">
                    <p className="text-sm leading-relaxed">
                      Connect Gmail and Google Calendar for AI-powered email drafting, meeting scheduling, and calendar sync.
                    </p>
                    <p className="text-sm leading-relaxed">
                      Automatically create drafts, send emails, and schedule meetings with intelligent context from your calendar events.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    {connectedEmailProvider === 'microsoft' && (
                      <div className="text-xs text-gray-500 italic">
                        Outlook is connected. Disconnect Outlook to use Google Workspace.
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {hasGmailConnection ? (
                        <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                          ✓ Connected
                        </span>
                      ) : connectedEmailProvider === 'microsoft' ? (
                        <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-500 font-medium">
                          Outlook Connected
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                          Ready to Connect
                        </span>
                      )}
                      {hasGmailConnection ? (
                        <button
                          onClick={disconnectGoogle}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            connectToGoogle().catch(err => console.error('Error:', err));
                          }}
                          disabled={connectedEmailProvider === 'microsoft'}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            connectedEmailProvider === 'microsoft'
                              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                              : 'text-white bg-[#F95B14] hover:bg-orange-600'
                          }`}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Outlook */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all hover:border-gray-300 relative group">
                <button
                  onClick={() => {
                    setSelectedIntegration('outlook');
                    setShowIntegrationHelp(true);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-100 flex items-center justify-center transition-colors group/help z-10"
                  title="View documentation"
                >
                  <svg className="w-4 h-4 text-gray-500 group-hover/help:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </button>
                
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <Image 
                      src="/Outlook_icon.svg" 
                      alt="Outlook" 
                      width={40}
                      height={40}
                      className="w-10 h-10"
                    />
                    <div className="flex-1">
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
                  <div className="mt-6 flex flex-col gap-3">
                    {connectedEmailProvider === 'google' && (
                      <div className="text-xs text-gray-500 italic">
                        Google Workspace is connected. Disconnect Google to use Outlook.
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {hasOutlookConnection ? (
                        <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                          ✓ Connected
                        </span>
                      ) : connectedEmailProvider === 'google' ? (
                        <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-500 font-medium">
                          Google Connected
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
                          disabled={connectedEmailProvider === 'google'}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            connectedEmailProvider === 'google'
                              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                              : 'text-white bg-[#F95B14] hover:bg-orange-600'
                          }`}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monday.com */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all hover:border-gray-300 relative group">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 9a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 7a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-black">Monday.com</h3>
                      <p className="text-sm text-gray-600">CRM & Project Management</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-gray-700">
                    <p className="text-sm leading-relaxed">
                      Sync contacts from LinkedIn to Monday.com CRM boards automatically. Check if prospects exist and create new items seamlessly.
                    </p>
                    <p className="text-sm leading-relaxed">
                      AI-powered email drafting knows whether to write follow-up or cold outreach based on your Monday.com data.
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    {hasMondayConnection ? (
                      <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                        ✓ Connected
                      </span>
                    ) : (
                      <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                        Ready to Connect
                      </span>
                    )}
                    {hasMondayConnection ? (
                      <button
                        onClick={disconnectMonday}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={connectToMonday}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#F95B14] rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* HubSpot */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all hover:border-gray-300 relative group">
                <button
                  onClick={() => {
                    setSelectedIntegration('hubspot');
                    setShowIntegrationHelp(true);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-100 flex items-center justify-center transition-colors group/help z-10"
                  title="View documentation"
                >
                  <svg className="w-4 h-4 text-gray-500 group-hover/help:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </button>
                
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <Image 
                      src="/hubspot-1.svg" 
                      alt="HubSpot" 
                      width={40}
                      height={40}
                      className="w-10 h-10"
                    />
                    <div className="flex-1">
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

            </div>

            {/* Integration Help Modal */}
            {showIntegrationHelp && selectedIntegration && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowIntegrationHelp(false)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedIntegration === 'salesforce' && (
                        <>
                          <Image src="/salesforcelogo.svg" alt="Salesforce" width={32} height={32} className="w-8 h-8" />
                          <h2 className="text-2xl font-bold text-gray-900">Salesforce Integration</h2>
                        </>
                      )}
                      {selectedIntegration === 'gmail' && (
                        <>
                          <Image src="/Gmail Icon.svg" alt="Google Workspace" width={32} height={32} className="w-8 h-8" />
                          <h2 className="text-2xl font-bold text-gray-900">Google Workspace Integration</h2>
                        </>
                      )}
                      {selectedIntegration === 'outlook' && (
                        <>
                          <Image src="/Outlook_icon.svg" alt="Outlook" width={32} height={32} className="w-8 h-8" />
                          <h2 className="text-2xl font-bold text-gray-900">Microsoft Outlook Integration</h2>
                        </>
                      )}
                      {selectedIntegration === 'linkedin' && (
                        <>
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">LinkedIn Chrome Extension</h2>
                        </>
                      )}
                      {selectedIntegration === 'hubspot' && (
                        <>
                          <Image src="/hubspot-1.svg" alt="HubSpot" width={32} height={32} className="w-8 h-8" />
                          <h2 className="text-2xl font-bold text-gray-900">HubSpot Integration</h2>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setShowIntegrationHelp(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-6">
                    {selectedIntegration === 'salesforce' && (
                      <div className="space-y-4">
                        {/* Tabs */}
                        <div className="border-b border-gray-200">
                          <nav className="flex space-x-8">
                            <button
                              onClick={() => setSalesforceHelpTab('tools')}
                              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                salesforceHelpTab === 'tools'
                                  ? 'border-[#F95B14] text-[#F95B14]'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              Tools
                            </button>
                            <button
                              onClick={() => setSalesforceHelpTab('user')}
                              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                salesforceHelpTab === 'user'
                                  ? 'border-[#F95B14] text-[#F95B14]'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              User Connect
                            </button>
                            <button
                              onClick={() => setSalesforceHelpTab('org')}
                              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                salesforceHelpTab === 'org'
                                  ? 'border-[#F95B14] text-[#F95B14]'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              Connect Org
                            </button>
                          </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="pt-2">
                          {/* Tools Tab */}
                          {salesforceHelpTab === 'tools' && (
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">Available AI Functions</h3>
                              <p className="text-sm text-gray-600 mb-6">
                                Once connected, you can ask the AI to perform these Salesforce actions directly from your conversations:
                              </p>
                              <ul className="space-y-4 text-gray-700">
                                <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Search Contacts & Leads</div>
                                    <div className="text-sm text-gray-600 mt-1">Find people in your CRM by name, email, or company</div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                      "Find all contacts at Acme Corp"
                                    </div>
                                  </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Create New Leads</div>
                                    <div className="text-sm text-gray-600 mt-1">Add new prospects to your Salesforce pipeline</div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                      "Create a lead for John Smith at TechCo, title: CEO, email: john@techco.com"
                                    </div>
                                  </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Create New Contacts</div>
                                    <div className="text-sm text-gray-600 mt-1">Add established relationships to your CRM</div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                      "Create a contact for Sarah Johnson, email: sarah@company.com"
                                    </div>
                                  </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Update Records</div>
                                    <div className="text-sm text-gray-600 mt-1">Modify contact or lead information</div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                      "Update John's status to qualified and add phone number 555-1234"
                                    </div>
                                  </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Add Notes</div>
                                    <div className="text-sm text-gray-600 mt-1">Log call notes, meeting outcomes, or important details</div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                      "Add a note to the Smith account: Had a great call, interested in Q1 pricing"
                                    </div>
                                  </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Create Tasks & Reminders</div>
                                    <div className="text-sm text-gray-600 mt-1">Schedule follow-ups with due dates and priority levels</div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                      "Create a high-priority task to follow up with Jane Doe on 2025-11-15"
                                    </div>
                                  </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <svg className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Get Recent Activity</div>
                                    <div className="text-sm text-gray-600 mt-1">View interaction history, tasks, and notes for any contact</div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                      "Show me recent activity for john@techco.com"
                                    </div>
                                  </div>
                                </li>

                                <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                  </svg>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900">Execute Custom SOQL Queries</div>
                                    <div className="text-sm text-gray-600 mt-1">Run advanced queries for complex data retrieval</div>
                                    <div className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                      "Query Salesforce for all opportunities closed this quarter"
                                    </div>
                                  </div>
                                </li>
                              </ul>

                              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips:</h4>
                                <ul className="space-y-1 text-sm text-blue-800">
                                  <li>• Combine functions: "Search for contacts at Acme and create a follow-up task"</li>
                                  <li>• Use natural language - the AI understands context</li>
                                  <li>• All actions are logged in your Activity tab for tracking</li>
                                  <li>• Works seamlessly with LinkedIn profile analysis</li>
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* User Connect Tab */}
                          {salesforceHelpTab === 'user' && (
                            <div className="space-y-6">
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h4 className="font-semibold text-purple-900 mb-2">User-Level Connection</h4>
                                <p className="text-sm text-purple-800">
                                  Connect your personal Salesforce account. This is useful if you have your own Salesforce instance
                                  or want to use different CRM data than your organization's shared connection.
                                </p>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Connect Your Salesforce</h3>
                                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                                  <li className="pl-2">
                                    <span className="font-medium">Click the "Connect" button</span> on the Salesforce card above
                                  </li>
                                  <li className="pl-2">
                                    <span className="font-medium">Sign in to your Salesforce account</span> (can be any Salesforce org)
                                  </li>
                                  <li className="pl-2">
                                    <span className="font-medium">Grant Curiosity Engine access</span> to your CRM data
                                  </li>
                                  <li className="pl-2">
                                    <span className="font-medium">You'll be redirected back</span> to the dashboard with a success message
                                  </li>
                                </ol>
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">Note</h4>
                                <p className="text-sm text-gray-700">
                                  Your personal connection takes priority over any organization-level connection. 
                                  This means you'll always use YOUR Salesforce data when drafting emails.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Connect Org Tab */}
                          {salesforceHelpTab === 'org' && (
                            <div className="space-y-6">
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 mb-2">Organization-Level Connection</h4>
                                <p className="text-sm text-blue-800">
                                  Connect your Salesforce org once, and all team members will have access to CRM data.
                                  This is recommended for teams sharing a single Salesforce instance.
                                </p>
                              </div>

                              {/* Step 1: Enter Credentials */}
                              <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                                <div className="flex items-start gap-3 mb-4">
                                  <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                                    1
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Your Salesforce Credentials</h3>
                                    <p className="text-sm text-gray-700 mb-4">
                                      After creating your Connected App in Salesforce (see instructions below), enter the credentials here:
                                    </p>
                                  </div>
                                </div>
                                
                                {sfCredentialsSaved ? (
                                  <div className="space-y-3">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                      <p className="text-sm text-green-800 font-medium">
                                        ✅ Credentials saved! You can proceed to Step 2 below.
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSfCredentialsSaved(false);
                                        setSfClientId('');
                                        setSfClientSecret('');
                                        setShowSfSecret(false);
                                        setSfCredentialsMessage('');
                                      }}
                                      className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                                    >
                                      🔄 Edit / Replace Credentials
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Consumer Key (Client ID) <span className="text-red-500">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={sfClientId}
                                        onChange={(e) => setSfClientId(e.target.value)}
                                        placeholder="3MVG9..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Consumer Secret (Client Secret) <span className="text-red-500">*</span>
                                      </label>
                                      <div className="relative">
                                        <input
                                          type={showSfSecret ? "text" : "password"}
                                          value={sfClientSecret}
                                          onChange={(e) => setSfClientSecret(e.target.value)}
                                          placeholder="Enter your Consumer Secret"
                                          className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setShowSfSecret(!showSfSecret)}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                          title={showSfSecret ? "Hide secret" : "Show secret"}
                                        >
                                          {showSfSecret ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                          ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    
                                    {sfCredentialsMessage && (
                                      <div className={`p-3 rounded-lg text-sm ${
                                        sfCredentialsMessage.includes('✅') 
                                          ? 'bg-green-50 text-green-800 border border-green-200' 
                                          : 'bg-red-50 text-red-800 border border-red-200'
                                      }`}>
                                        {sfCredentialsMessage}
                                      </div>
                                    )}
                                    
                                    <button
                                      onClick={saveSalesforceCredentials}
                                      disabled={sfCredentialsLoading || !sfClientId || !sfClientSecret}
                                      className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                      {sfCredentialsLoading ? 'Saving...' : 'Save Credentials'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Step 2: Complete OAuth */}
                              <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
                                <div className="flex items-start gap-3 mb-4">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                                    2
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Salesforce</h3>
                                    <p className="text-sm text-gray-700 mb-4">
                                      After saving your credentials above, click this button to authorize Curiosity Engine in your Salesforce org:
                                    </p>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={connectSalesforceOrg}
                                  disabled={!sfCredentialsSaved}
                                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  {sfCredentialsSaved ? 'Connect Salesforce' : 'Save Credentials First (Step 1)'}
                                </button>
                              </div>

                              <div className="border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Get Your Credentials</h3>
                                <p className="text-sm text-gray-700 mb-4">
                                  Follow these steps in your Salesforce org to create a Connected App and get your Consumer Key and Secret:
                                </p>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Prerequisites</h3>
                                <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
                                  <li>You must be a Salesforce administrator in your Salesforce org</li>
                                  <li>You must have Organization Admin role in Curiosity Engine</li>
                                  <li>Your Salesforce account must have permission to authorize third-party apps</li>
                                </ul>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Step A: Create Connected App in Salesforce</h3>
                                <ol className="list-decimal list-inside space-y-3 text-gray-700 text-sm">
                                  <li className="pl-2">
                                    Log into your Salesforce org at <strong>login.salesforce.com</strong>
                                  </li>
                                  <li className="pl-2">
                                    Click the <strong>⚙️ Setup</strong> icon (gear in top right)
                                  </li>
                                  <li className="pl-2">
                                    In Quick Find, search for <strong>"App Manager"</strong>
                                  </li>
                                  <li className="pl-2">
                                    Click <strong>"New Connected App"</strong>
                                  </li>
                                  <li className="pl-2">
                                    Fill in basic information:
                                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 space-y-1 text-xs">
                                      <div>• <strong>Connected App Name:</strong> Curiosity Engine</div>
                                      <div>• <strong>API Name:</strong> Curiosity_Engine (auto-filled)</div>
                                      <div>• <strong>Contact Email:</strong> Your email</div>
                                    </div>
                                  </li>
                                  <li className="pl-2">
                                    Check <strong>"Enable OAuth Settings"</strong>
                                  </li>
                                  <li className="pl-2">
                                    <strong>Callback URL:</strong> Enter this EXACT URL:
                                    <div className="mt-2 bg-white border border-gray-300 rounded p-2 font-mono text-xs">
                                      https://www.curiosityengine.io/api/salesforce/callback
                                    </div>
                                  </li>
                                  <li className="pl-2">
                                    <strong>Selected OAuth Scopes:</strong> Add these three scopes:
                                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 space-y-1 text-xs">
                                      <div>• Access the identity URL service (id, profile, email, address, phone)</div>
                                      <div>• Manage user data via APIs (api)</div>
                                      <div>• Perform requests at any time (refresh_token, offline_access)</div>
                                    </div>
                                  </li>
                                  <li className="pl-2">
                                    Check <strong>"Require Secret for Web Server Flow"</strong>
                                  </li>
                                  <li className="pl-2">
                                    Click <strong>"Save"</strong> → Then click <strong>"Continue"</strong>
                                  </li>
                                </ol>
                              </div>

                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Step B: Get Your Credentials</h3>
                                <ol className="list-decimal list-inside space-y-3 text-gray-700 text-sm">
                                  <li className="pl-2">
                                    You'll see your <strong>Consumer Key</strong> - copy it
                                  </li>
                                  <li className="pl-2">
                                    Click <strong>"Manage Consumer Details"</strong> to reveal <strong>Consumer Secret</strong> - copy it
                                  </li>
                                  <li className="pl-2">
                                    Go to <strong>Setup</strong> → <strong>App Manager</strong> → Find your app → <strong>Manage</strong> → <strong>"Edit Policies"</strong>
                                  </li>
                                  <li className="pl-2">
                                    Set <strong>"Permitted Users"</strong> to <strong>"All users may self-authorize"</strong>
                                  </li>
                                  <li className="pl-2">
                                    Set <strong>"IP Relaxation"</strong> to <strong>"Relax IP restrictions"</strong>
                                  </li>
                                  <li className="pl-2">
                                    Click <strong>"Save"</strong>
                                  </li>
                                  <li className="pl-2">
                                    Return to this page and enter your credentials in <strong>Step 1</strong> above
                                  </li>
                                </ol>
                              </div>

                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-semibold text-green-900 mb-2">✅ What Happens After Connection</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                                  <li>All team members can use Salesforce CRM data in AI email drafting</li>
                                  <li>System will check if LinkedIn prospects exist in your Salesforce</li>
                                  <li>New contacts will be automatically created in your Salesforce</li>
                                  <li>AI emails will be tailored based on CRM context (follow-up vs cold outreach)</li>
                                </ul>
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">🔒 Security & Privacy</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                                  <li>We never store your Salesforce password - only secure OAuth tokens</li>
                                  <li>We only access Contacts, Leads, and related activities</li>
                                  <li>You can revoke access anytime from Salesforce Connected Apps settings</li>
                                  <li>Your credentials are encrypted and stored securely in our database</li>
                                </ul>
                              </div>

                              {/* Troubleshooting / Reset Section */}
                              {(sfCredentialsSaved || hasSalesforceConnection) && (
                                <div className="border-t border-gray-300 pt-6">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 Troubleshooting</h3>
                                  <p className="text-sm text-gray-700 mb-3">
                                    Having issues connecting? You can reset the entire Salesforce connection to start fresh.
                                  </p>
                                  <button
                                    onClick={resetSalesforceConnection}
                                    disabled={sfCredentialsLoading}
                                    className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors border border-red-200 text-sm disabled:opacity-50"
                                  >
                                    🔄 Reset Connection & Clear Credentials
                                  </button>
                                  <p className="text-xs text-gray-500 mt-2">
                                    This will remove all saved credentials and disconnect Salesforce. Use this if you need to enter different credentials or troubleshoot connection issues.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedIntegration === 'gmail' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Connect</h3>
                          <ol className="list-decimal list-inside space-y-2 text-gray-700">
                            <li>Click the "Connect" button on the Google Workspace card</li>
                            <li>Sign in to your Google account</li>
                            <li>Grant access to Gmail and Google Calendar (read and write)</li>
                            <li>Both email and calendar will be connected automatically</li>
                          </ol>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Available AI Functions</h3>
                          <ul className="space-y-2 text-gray-700">
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <span><strong>Search emails:</strong> "Show me emails from john@example.com" or "Find unread emails about the proposal"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Create email drafts:</strong> "Draft an email to john@example.com about the demo"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Send emails:</strong> "Send an email to jane@company.com with project update"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span><strong>Search calendar:</strong> "What meetings do I have with Acme Corp?" or "Show my schedule this week"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Schedule meetings:</strong> "Schedule a meeting with Bob tomorrow at 2pm"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span><strong>Sync calendar:</strong> Click the Sync button to refresh your calendar events</span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-900">
                            <strong>Note:</strong> Connecting Google Workspace grants access to both Gmail (read + write) and Google Calendar (read + write) simultaneously. You cannot connect both Google and Microsoft email providers at the same time.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {selectedIntegration === 'outlook' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Connect</h3>
                          <ol className="list-decimal list-inside space-y-2 text-gray-700">
                            <li>Click the "Connect" button on the Outlook card</li>
                            <li>Sign in to your Microsoft account</li>
                            <li>Grant access to Outlook Mail and Calendar</li>
                            <li>Both email and calendar will be connected automatically</li>
                          </ol>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Available AI Functions</h3>
                          <ul className="space-y-2 text-gray-700">
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Create email drafts:</strong> "Draft an email to john@example.com about the proposal"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Send emails:</strong> "Send an email to jane@company.com about next steps"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Schedule meetings:</strong> "Create a meeting with Sarah next Monday at 10am"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Search emails:</strong> "Find recent emails from prospect@company.com"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Sync calendar:</strong> Click the Sync button to refresh your calendar events</span>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-900">
                            <strong>Note:</strong> You cannot connect both Google and Microsoft email providers at the same time. Disconnect one to use the other.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {selectedIntegration === 'linkedin' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Connect</h3>
                          <ol className="list-decimal list-inside space-y-2 text-gray-700">
                            <li>Install the Curiosity Engine Chrome Extension</li>
                            <li>Navigate to any LinkedIn profile or company page</li>
                            <li>Click the extension icon in your browser</li>
                            <li>The extension will automatically analyze the profile</li>
                          </ol>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Available Features</h3>
                          <ul className="space-y-2 text-gray-700">
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Real-time profile analysis:</strong> Extract insights from LinkedIn profiles</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Company intelligence:</strong> Analyze company pages for buying signals</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Save to leads:</strong> Automatically save analyzed profiles to your Leads tab</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span><strong>Personalized outreach:</strong> Get AI-powered recommendations for engagement</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {selectedIntegration === 'hubspot' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
                          <p className="text-gray-700">
                            HubSpot integration is currently in development. Once available, you'll be able to:
                          </p>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Planned Features</h3>
                          <ul className="space-y-2 text-gray-700">
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Sync contacts and deals automatically</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>AI-enriched lead scoring</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Automated marketing sequences</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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

                {activityLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  
                  // Modern icon mapping
                  const getIcon = (type: string) => {
                    switch(type) {
                      case 'email_draft_created':
                        return (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                        );
                      case 'email_sent':
                        return (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </div>
                        );
                      case 'crm_lead_enriched':
                      case 'crm_note_added':
                        return (
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        );
                      case 'meeting_scheduled':
                        return (
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        );
                      case 'linkedin_analysis':
                        return (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </div>
                        );
                      case 'integration_connected':
                        return (
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        );
                      default:
                        return (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        );
                    }
                  };
                  
                  return (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
                    >
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="w-full p-5 text-left"
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          {getIcon(log.action_type)}
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900 text-base">{log.action_title}</h3>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                  log.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  log.status === 'failed' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {log.status}
                                </span>
                                <svg 
                                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            {log.action_description && (
                              <p className="text-sm text-gray-600 mb-2">{log.action_description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                      
                      {/* Expanded Details */}
                      {isExpanded && log.metadata && (
                        <div className="border-t border-gray-200 bg-gray-50 p-5">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Details
                          </h4>
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-64">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
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

