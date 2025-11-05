'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
  account_type: string;
  max_seats: number;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  user_context: {
    aboutMe?: string;
    objectives?: string;
  };
}

interface Analysis {
  id: string;
  user_id: string;
  linkedin_url: string;
  profile_name: string;
  profile_headline: string;
  created_at: string;
  users: {
    email: string;
    full_name: string;
  };
}

interface EmailGeneration {
  id: string;
  user_id: string;
  linkedin_url: string;
  profile_name: string;
  subject: string;
  body: string;
  created_at: string;
  users: {
    email: string;
    full_name: string;
  };
}

interface Integration {
  id: string;
  integration_type: string;
  is_enabled: boolean;
  enabled_at: string;
}

type TabType = 'overview' | 'users' | 'invitations' | 'analyses' | 'emails' | 'integrations' | 'context';

export default function OrganizationDashboard() {
  // Use NextAuth session
  const { data: session, status } = useSession();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [emails, setEmails] = useState<EmailGeneration[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<'org_admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitePermissions, setInvitePermissions] = useState({
    can_view_org_materials: true,
    can_upload_materials: true,
    can_delete_own_materials: true,
    can_share_materials: false,
    can_view_team_analyses: true,
    can_view_team_emails: false,
  });
  const router = useRouter();
  
  // Organization context state
  const [orgContext, setOrgContext] = useState<any>({ aboutUs: '', objectives: '', valueProposition: '' });
  const [tempOrgContext, setTempOrgContext] = useState<any>({ aboutUs: '', objectives: '', valueProposition: '' });
  const [savingOrgContext, setSavingOrgContext] = useState(false);
  const [orgContextMessage, setOrgContextMessage] = useState('');

  useEffect(() => {
    console.log('📊 Org dashboard - NextAuth status:', status);
    
    if (status === 'loading') {
      console.log('⏳ Waiting for NextAuth session...');
      return;
    }
    
    if (status === 'unauthenticated' || !session) {
      console.log('❌ Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated' && session?.user) {
      console.log('✅ Authenticated as:', session.user.email, 'Role:', session.user.role);
      
      // Check if org admin
      if (session.user.role !== 'org_admin' && session.user.role !== 'super_admin') {
        console.log('❌ Not an org admin, redirecting');
        router.push('/');
        return;
      }
      
      // Set user and org data from session
      setCurrentUser({
        id: session.user.id!,
        email: session.user.email!,
        full_name: session.user.name || '',
        role: session.user.role as any,
        organization_id: session.user.organizationId!,
        user_context: {},
        is_active: true,
        created_at: new Date().toISOString()
      });
      
      setOrganization({
        id: session.user.organizationId!,
        name: session.user.organizationName || 'Organization',
        account_type: session.user.accountType || 'organization',
        max_seats: 10,
        created_at: new Date().toISOString()
      });
      
      setLoading(false);
      
      // Load organization data
      console.log('📥 Loading org data for:', session.user.organizationId);
      // For NextAuth, we need to get a Supabase token - we'll create one
      loadDataWithNextAuth(session.user.organizationId!);
    }
  }, [status, session, router]);

  async function loadDataWithNextAuth(organizationId: string) {
    console.log('[DATA-1] Loading organization data for:', organizationId);
    
    try {
      console.log('[DATA-2] Calling /api/admin/organization-data...');
      const startTime = Date.now();
      
      // NextAuth doesn't give us Supabase tokens, so we'll use a different approach
      // The API will validate the NextAuth session internally
      const response = await fetch('/api/admin/organization-data');

      const elapsed = Date.now() - startTime;
      console.log(`[DATA-5] API responded in ${elapsed}ms with status:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DATA-6] API Error:', errorText);
        throw new Error('API returned ' + response.status);
      }

      console.log('[DATA-7] Parsing JSON response...');
      const data = await response.json();
      
      console.log('[DATA-8] Data received:', {
        users: data.users?.length || 0,
        analyses: data.analyses?.length || 0,
        emails: data.emails?.length || 0,
        integrations: data.integrations?.length || 0
      });

      console.log('[DATA-9] Setting state...');
      setUsers(data.users || []);
      setAnalyses(data.analyses || []);
      setEmails(data.emails || []);
      setIntegrations(data.integrations || []);
      
      // Load organization context
      if (data.organization?.org_context) {
        const ctx = data.organization.org_context;
        setOrgContext(ctx);
        setTempOrgContext(ctx);
      }

      if (data.users) {
        console.log('[DATA-10] Users:', data.users.map((u: any) => ({ email: u.email, role: u.role, org: u.organization_id })));
      }
      
      console.log('✅ [DATA-COMPLETE] All data loaded and state set');
    } catch (err) {
      console.error('❌ [DATA-ERROR] Error loading organization data:', err);
      // Set empty arrays so dashboard still renders
      setUsers([]);
      setAnalyses([]);
      setEmails([]);
      setIntegrations([]);
    }
  }

  async function handleInviteUser() {
    console.log('Sending invitation:', { 
      organization: !!organization, 
      email: inviteEmail, 
      role: inviteRole 
    });
    
    if (!organization || !organization.id) {
      alert('Organization not loaded. Please refresh the page.');
      return;
    }
    
    if (!inviteEmail) {
      alert('Please enter an email address');
      return;
    }

    setInviteLoading(true);
    try {
      console.log('Sending invitation to:', inviteEmail);

      // Use new invitation API
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          message: inviteMessage || null,
          permissions: invitePermissions,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      console.log('✅ Invitation sent:', data.invitation.id);

      // Show success message in modal with invitation link
      setInviteSuccess(`✅ Invitation sent to ${inviteEmail}!\n\nShare this link:\n${data.invitationLink}`);
      setInviteEmail('');
      setInviteMessage('');
      setInviteRole('member');
      setInvitePermissions({
        can_view_org_materials: true,
        can_upload_materials: true,
        can_delete_own_materials: true,
        can_share_materials: false,
        can_view_team_analyses: true,
        can_view_team_emails: false,
      });
      
      // Close modal after 5 seconds
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess('');
      }, 5000);
      
      // Reload invitations list
      loadInvitations();
    } catch (err: any) {
      console.error('Invitation error:', err);
      alert('Failed to send invitation: ' + err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function loadInvitations() {
    try {
      const response = await fetch('/api/invitations');
      const data = await response.json();
      if (response.ok) {
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    if (!confirm('Revoke this invitation?')) return;
    
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke invitation');
      }

      alert('✅ Invitation revoked');
      loadInvitations();
    } catch (err: any) {
      alert('Failed to revoke invitation: ' + err.message);
    }
  }

  async function handleResetPassword(userId: string, userEmail: string) {
    const newPassword = prompt(`Reset password for ${userEmail}?\n\nEnter new password (min 6 characters):`);
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newPassword,
          organizationId: organization?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      alert(`✅ Password reset successfully for ${userEmail}`);
    } catch (err: any) {
      alert('Failed to reset password: ' + err.message);
    }
  }

  async function handleDeleteUser(userId: string, userEmail: string) {
    const confirmed = confirm(`⚠️ Delete ${userEmail}?\n\nThis will permanently delete:\n• Their account\n• All their analyses\n• All their emails\n\nThis action cannot be undone!`);
    
    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId: organization?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      alert(`✅ User ${userEmail} has been deleted`);
      
      // Reload users list
      if (organization?.id) {
        loadData(organization.id);
      }
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message);
    }
  }

  async function handleToggleIntegration(integrationType: string, currentlyEnabled: boolean) {
    if (!organization) return;

    // For Salesforce, handle OAuth separately
    if (integrationType === 'salesforce') {
      if (currentlyEnabled) {
        // Disconnect Salesforce
        if (!confirm('Disconnect Salesforce? This will remove your integration and stop syncing.')) {
          return;
        }
        
        try {
          const response = await fetch('/api/salesforce/disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to disconnect Salesforce');
          }
          
          alert('✅ Salesforce disconnected successfully');
          if (organization.id) {
            loadDataWithNextAuth(organization.id);
          }
        } catch (err: any) {
          alert('Failed to disconnect Salesforce: ' + err.message);
        }
      } else {
        // Connect Salesforce with OAuth
        handleConnectSalesforce();
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_integrations')
        .upsert({
          organization_id: organization.id,
          integration_type: integrationType,
          is_enabled: !currentlyEnabled,
          enabled_at: !currentlyEnabled ? new Date().toISOString() : null,
          enabled_by: currentUser?.id,
        }, {
          onConflict: 'organization_id,integration_type'
        });

      if (error) throw error;

      // Reload integrations
      loadDataWithNextAuth(organization.id);
    } catch (err: any) {
      alert('Failed to toggle integration: ' + err.message);
    }
  }

  async function handleConnectSalesforce() {
    if (!currentUser?.id) {
      alert('User not loaded');
      return;
    }

    try {
      // Get OAuth URL from backend
      const response = await fetch(`/api/salesforce/auth?userId=${currentUser.id}`);
      const data = await response.json();

      if (!response.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to get Salesforce OAuth URL');
      }

      // Open Salesforce OAuth in new window
      window.location.href = data.authUrl;
    } catch (err: any) {
      alert('Failed to initiate Salesforce connection: ' + err.message);
    }
  }


  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAnalyses = selectedUser
    ? analyses.filter(a => a.user_id === selectedUser)
    : analyses.filter(a =>
        a.profile_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.linkedin_url.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const filteredEmails = selectedUser
    ? emails.filter(e => e.user_id === selectedUser)
    : emails.filter(e =>
        e.profile_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f7fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#718096' }}>Loading organization dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1a202c',
              marginBottom: '4px'
            }}>
              {organization?.name} Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: '#718096' }}>
              Organization Admin • {currentUser?.full_name || currentUser?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          gap: '32px'
        }}>
          {(['overview', 'users', 'invitations', 'analyses', 'emails', 'context', 'integrations'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'invitations') loadInvitations();
              }}
              style={{
                padding: '16px 0',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #667eea' : '2px solid transparent',
                color: activeTab === tab ? '#667eea' : '#718096',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
              {tab === 'invitations' && invitations.filter(i => i.status === 'pending').length > 0 && (
                <span style={{
                  marginLeft: '6px',
                  padding: '2px 6px',
                  background: '#f59e0b',
                  color: 'white',
                  fontSize: '10px',
                  borderRadius: '10px',
                  fontWeight: '700'
                }}>
                  {invitations.filter(i => i.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                  Total Users
                </p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a202c' }}>
                  {users.length} / {organization?.max_seats}
                </p>
                <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                  Active seats
                </p>
              </div>

              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                  Profile Analyses
                </p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a202c' }}>
                  {analyses.length}
                </p>
                <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                  Total analyzed
                </p>
              </div>

              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                  Emails Generated
                </p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a202c' }}>
                  {emails.length}
                </p>
                <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                  Total created
                </p>
              </div>

              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <p style={{ fontSize: '14px', color: '#718096', marginBottom: '8px' }}>
                  Active Integrations
                </p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a202c' }}>
                  {integrations.filter(i => i.is_enabled).length}
                </p>
                <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                  Enabled services
                </p>
              </div>
            </div>

            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Recent Activity
              </h2>
              <div style={{ color: '#718096', fontSize: '14px' }}>
                <p style={{ marginBottom: '12px' }}>
                  • {analyses.filter(a => {
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return new Date(a.created_at) > dayAgo;
                  }).length} analyses in the last 24 hours
                </p>
                <p style={{ marginBottom: '12px' }}>
                  • {emails.filter(e => {
                    const dayAgo = new Date();
                    dayAgo.setDate(dayAgo.getDate() - 1);
                    return new Date(e.created_at) > dayAgo;
                  }).length} emails generated in the last 24 hours
                </p>
                <p>
                  • {users.filter(u => u.is_active).length} active users
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  marginRight: '12px'
                }}
              />
              <button
                onClick={() => setShowInviteModal(true)}
                style={{
                  padding: '12px 24px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                + Add User
              </button>
            </div>

            {/* Debug info */}
            <div style={{
              padding: '12px',
              background: '#eff6ff',
              border: '1px solid #93c5fd',
              borderRadius: '8px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#1e40af'
            }}>
              Total users: {users.length} | Filtered: {filteredUsers.length} | Search: "{searchTerm}"
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {filteredUsers.length === 0 && (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#718096'
                }}>
                  {users.length === 0 
                    ? 'No users found. Click "+ Add User" to create team members.' 
                    : `No users match "${searchTerm}". Clear search to see all ${users.length} users.`}
                </div>
              )}
              
              {filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  style={{
                    padding: '20px',
                    borderBottom: index < filteredUsers.length - 1 ? '1px solid #f7fafc' : 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedUser(user.id === selectedUser ? null : user.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#1a202c',
                        marginBottom: '4px'
                      }}>
                        {user.full_name || 'No name'}
                        {user.role === 'org_admin' && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            background: '#667eea',
                            color: 'white',
                            fontSize: '10px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            ADMIN
                          </span>
                        )}
                        {!user.is_active && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            background: '#f56565',
                            color: 'white',
                            fontSize: '10px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            INACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>
                        {user.email}
                      </div>
                      <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </div>

                      {selectedUser === user.id && (
                        <div style={{ marginTop: '16px' }}>
                          {/* User Context */}
                          {user.user_context && (
                            <div style={{
                              padding: '12px',
                              background: '#f7fafc',
                              borderRadius: '8px',
                              fontSize: '13px',
                              marginBottom: '12px'
                            }}>
                              {user.user_context.aboutMe && (
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>About:</strong> {user.user_context.aboutMe}
                                </div>
                              )}
                              {user.user_context.objectives && (
                                <div>
                                  <strong>Objectives:</strong> {user.user_context.objectives}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetPassword(user.id, user.email);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: '#fbbf24',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              🔑 Reset Password
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user.id, user.email);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️ Delete User
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#718096' }}>
                      {analyses.filter(a => a.user_id === user.id).length} analyses<br />
                      {emails.filter(e => e.user_id === user.id).length} emails
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a202c' }}>
                User Invitations
              </h2>
              <button
                onClick={() => setShowInviteModal(true)}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                + Send Invitation
              </button>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {invitations.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#718096'
                }}>
                  No invitations sent yet. Click "+ Send Invitation" to invite team members.
                </div>
              ) : (
                invitations.map((invitation, index) => (
                  <div
                    key={invitation.id}
                    style={{
                      padding: '20px',
                      borderBottom: index < invitations.length - 1 ? '1px solid #f7fafc' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#1a202c',
                          marginBottom: '4px'
                        }}>
                          {invitation.email}
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 8px',
                            background: invitation.status === 'pending' ? '#f59e0b' : 
                                       invitation.status === 'accepted' ? '#10b981' : '#ef4444',
                            color: 'white',
                            fontSize: '10px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            {invitation.status.toUpperCase()}
                          </span>
                          {invitation.role === 'org_admin' && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 8px',
                              background: '#667eea',
                              color: 'white',
                              fontSize: '10px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>
                          Invited by: {invitation.inviter?.full_name || invitation.inviter?.email || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                          Sent: {new Date(invitation.created_at).toLocaleDateString()} • 
                          Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                        {invitation.invitation_message && (
                          <div style={{
                            marginTop: '8px',
                            padding: '8px',
                            background: '#f7fafc',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#4a5568'
                          }}>
                            Message: {invitation.invitation_message}
                          </div>
                        )}
                      </div>
                      <div>
                        {invitation.status === 'pending' && (
                          <button
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Analyses Tab */}
        {activeTab === 'analyses' && (
          <div>
            <input
              type="text"
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedUser(null);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '20px'
              }}
            />

            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {filteredAnalyses.map((analysis, index) => (
                <div
                  key={analysis.id}
                  style={{
                    padding: '20px',
                    borderBottom: index < filteredAnalyses.length - 1 ? '1px solid #f7fafc' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#1a202c',
                        marginBottom: '4px'
                      }}>
                        {analysis.profile_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>
                        {analysis.profile_headline}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#a0aec0', textAlign: 'right' }}>
                      {new Date(analysis.created_at).toLocaleString()}
                    </div>
                  </div>
                  <a
                    href={analysis.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '13px',
                      color: '#667eea',
                      textDecoration: 'none',
                      display: 'block',
                      marginBottom: '8px'
                    }}
                  >
                    {analysis.linkedin_url}
                  </a>
                  <div style={{
                    fontSize: '12px',
                    color: '#718096',
                    padding: '6px 10px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    By: {analysis.users.full_name || analysis.users.email}
                  </div>
                </div>
              ))}

              {filteredAnalyses.length === 0 && (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#a0aec0'
                }}>
                  No analyses found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div>
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedUser(null);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '20px'
              }}
            />

            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {filteredEmails.map((email, index) => (
                <div
                  key={email.id}
                  style={{
                    padding: '20px',
                    borderBottom: index < filteredEmails.length - 1 ? '1px solid #f7fafc' : 'none'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#1a202c',
                        marginBottom: '4px'
                      }}>
                        {email.subject}
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>
                        To: {email.profile_name}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#2d3748',
                        padding: '12px',
                        background: '#f7fafc',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        maxHeight: '100px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {email.body.substring(0, 200)}...
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#a0aec0', textAlign: 'right', marginLeft: '16px' }}>
                      {new Date(email.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#718096',
                    padding: '6px 10px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    By: {email.users.full_name || email.users.email}
                  </div>
                </div>
              ))}

              {filteredEmails.length === 0 && (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#a0aec0'
                }}>
                  No emails found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Organization Context Tab */}
        {activeTab === 'context' && (
          <div>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '8px'
              }}>
                Organization Context
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#718096',
                marginBottom: '24px',
                lineHeight: '1.6'
              }}>
                Set organization-wide context that will be included in all AI-generated emails for your team members. This supplements each user's personal context.
              </p>

              {orgContextMessage && (
                <div style={{
                  padding: '12px 16px',
                  background: '#d1fae5',
                  border: '1px solid #6ee7b7',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#065f46',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {orgContextMessage}
                </div>
              )}

              {/* About Us */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#2d3748'
                }}>
                  About Your Organization
                </label>
                <p style={{
                  fontSize: '13px',
                  color: '#718096',
                  marginBottom: '8px'
                }}>
                  Describe your company, what you do, and your unique value proposition.
                </p>
                <textarea
                  value={tempOrgContext.aboutUs || ''}
                  onChange={(e) => setTempOrgContext({ ...tempOrgContext, aboutUs: e.target.value })}
                  placeholder="E.g., We are TechCorp, a leading provider of enterprise healthcare solutions..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Objectives */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#2d3748'
                }}>
                  Organization Objectives
                </label>
                <p style={{
                  fontSize: '13px',
                  color: '#718096',
                  marginBottom: '8px'
                }}>
                  What are your organization's sales goals and target markets?
                </p>
                <textarea
                  value={tempOrgContext.objectives || ''}
                  onChange={(e) => setTempOrgContext({ ...tempOrgContext, objectives: e.target.value })}
                  placeholder="E.g., Target healthcare decision-makers, expand in enterprise market, focus on C-level executives..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Value Proposition */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#2d3748'
                }}>
                  Value Proposition
                </label>
                <p style={{
                  fontSize: '13px',
                  color: '#718096',
                  marginBottom: '8px'
                }}>
                  What unique value does your organization provide to customers?
                </p>
                <textarea
                  value={tempOrgContext.valueProposition || ''}
                  onChange={(e) => setTempOrgContext({ ...tempOrgContext, valueProposition: e.target.value })}
                  placeholder="E.g., We reduce healthcare costs by 30% through AI-powered automation while improving patient outcomes..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={async () => {
                  setSavingOrgContext(true);
                  try {
                    const response = await fetch('/api/organization/context', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orgContext: tempOrgContext })
                    });

                    if (!response.ok) {
                      throw new Error('Failed to save organization context');
                    }

                    setOrgContext(tempOrgContext);
                    setOrgContextMessage('✅ Organization context saved successfully!');
                    setTimeout(() => setOrgContextMessage(''), 3000);
                  } catch (err: any) {
                    alert('Error saving context: ' + err.message);
                  } finally {
                    setSavingOrgContext(false);
                  }
                }}
                disabled={savingOrgContext}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: savingOrgContext ? '#a0aec0' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: savingOrgContext ? 'not-allowed' : 'pointer'
                }}
              >
                {savingOrgContext ? 'Saving...' : 'Save Organization Context'}
              </button>

              {/* Info Box */}
              <div style={{
                marginTop: '20px',
                padding: '16px',
                background: '#eff6ff',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#1e40af',
                lineHeight: '1.6'
              }}>
                <strong>ℹ️ How it works:</strong> This organizational context will be automatically included in all AI-generated emails for your team members, in addition to their personal context. This ensures consistent messaging across your organization while still allowing personalization.
              </div>
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Manage Integrations
              </h2>
              <p style={{ fontSize: '14px', color: '#718096', marginBottom: '20px' }}>
                Control which integrations are available to your team members. Only enabled integrations will appear in the user's extension.
              </p>
            </div>

            <div style={{
              background: '#eff6ff',
              border: '1px solid #93c5fd',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#1e40af',
              lineHeight: '1.6'
            }}>
              <strong>ℹ️ Salesforce Integration:</strong> Team members can connect their own Salesforce accounts directly from the Chrome extension (Integrations tab). Each user manages their own CRM connection.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {/* Other Integrations */}
              {['hubspot', 'gmail', 'outlook', 'calendar', 'slack'].map(integrationType => {
                const integration = integrations.find(i => i.integration_type === integrationType);
                const isEnabled = integration?.is_enabled || false;

                return (
                  <div
                    key={integrationType}
                    style={{
                      background: 'white',
                      padding: '20px',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      border: isEnabled ? '2px solid #667eea' : '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        color: '#1a202c'
                      }}>
                        {integrationType}
                      </h3>
                      {isEnabled && (
                        <span style={{
                          padding: '4px 8px',
                          background: '#48bb78',
                          color: 'white',
                          fontSize: '10px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          ENABLED
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: '13px',
                      color: '#718096',
                      marginBottom: '16px'
                    }}>
                      {isEnabled 
                        ? `Available to all team members since ${new Date(integration.enabled_at).toLocaleDateString()}`
                        : 'Not available to team members'}
                    </p>
                    <button
                      onClick={() => handleToggleIntegration(integrationType, isEnabled)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: isEnabled ? '#f56565' : '#a0aec0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isEnabled ? 'pointer' : 'not-allowed',
                        opacity: isEnabled ? 1 : 0.6
                      }}
                      disabled={!isEnabled}
                      title={!isEnabled ? 'Coming soon' : ''}
                    >
                      {isEnabled ? 'Disable' : 'Coming Soon'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '8px',
              color: '#1a202c'
            }}>
              Send User Invitation
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#4a5568',
              marginBottom: '24px'
            }}>
              Invite someone to join your organization. They'll receive an invitation link to create their account.
            </p>

            {inviteSuccess && (
              <div style={{
                padding: '16px',
                background: '#d1fae5',
                border: '2px solid #10b981',
                borderRadius: '8px',
                marginBottom: '20px',
                color: '#065f46',
                fontSize: '12px',
                fontWeight: '500',
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {inviteSuccess}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#2d3748'
              }}>
                Email Address *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#1a202c'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#2d3748'
              }}>
                Personal Message (Optional)
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message to the invitation..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  color: '#1a202c',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#2d3748'
              }}>
                Role *
              </label>
              <select
                value={inviteRole}
                onChange={(e) => {
                  const newRole = e.target.value as 'org_admin' | 'member';
                  setInviteRole(newRole);
                  // Auto-set permissions based on role
                  if (newRole === 'org_admin') {
                    setInvitePermissions({
                      can_view_org_materials: true,
                      can_upload_materials: true,
                      can_delete_own_materials: true,
                      can_share_materials: true,
                      can_view_team_analyses: true,
                      can_view_team_emails: true,
                    });
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                  color: '#1a202c',
                  backgroundColor: 'white'
                }}
              >
                <option value="member">Member</option>
                <option value="org_admin">Organization Admin</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#2d3748'
              }}>
                Permissions
              </label>
              <div style={{
                background: '#f7fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '13px'
              }}>
                {inviteRole === 'org_admin' && (
                  <p style={{ color: '#718096', marginBottom: '12px', fontStyle: 'italic' }}>
                    Organization Admins get all permissions by default
                  </p>
                )}
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={invitePermissions.can_view_org_materials}
                    onChange={(e) => setInvitePermissions({...invitePermissions, can_view_org_materials: e.target.checked})}
                    disabled={inviteRole === 'org_admin'}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: '#2d3748' }}>View organization materials</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={invitePermissions.can_upload_materials}
                    onChange={(e) => setInvitePermissions({...invitePermissions, can_upload_materials: e.target.checked})}
                    disabled={inviteRole === 'org_admin'}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: '#2d3748' }}>Upload sales materials</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={invitePermissions.can_share_materials}
                    onChange={(e) => setInvitePermissions({...invitePermissions, can_share_materials: e.target.checked})}
                    disabled={inviteRole === 'org_admin'}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: '#2d3748' }}>Share materials with team</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={invitePermissions.can_view_team_analyses}
                    onChange={(e) => setInvitePermissions({...invitePermissions, can_view_team_analyses: e.target.checked})}
                    disabled={inviteRole === 'org_admin'}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: '#2d3748' }}>View team profile analyses</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={invitePermissions.can_view_team_emails}
                    onChange={(e) => setInvitePermissions({...invitePermissions, can_view_team_emails: e.target.checked})}
                    disabled={inviteRole === 'org_admin'}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: '#2d3748' }}>View team email generations</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteMessage('');
                  setInviteRole('member');
                  setInviteSuccess('');
                  setInvitePermissions({
                    can_view_org_materials: true,
                    can_upload_materials: true,
                    can_delete_own_materials: true,
                    can_share_materials: false,
                    can_view_team_analyses: true,
                    can_view_team_emails: false,
                  });
                }}
                disabled={inviteLoading || !!inviteSuccess}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: inviteLoading ? 'not-allowed' : 'pointer',
                  color: '#2d3748'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={inviteLoading || !!inviteSuccess || !inviteEmail}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: (inviteLoading || !!inviteSuccess || !inviteEmail) ? '#a0aec0' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (inviteLoading || !!inviteSuccess || !inviteEmail) ? 'not-allowed' : 'pointer'
                }}
              >
                {inviteLoading ? 'Sending...' : inviteSuccess ? '✓ Sent' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

