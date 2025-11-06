'use client';

import { useState, useEffect } from 'react';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface TeamTabProps {
  organizationId: string;
}

export default function TeamTab({ organizationId }: TeamTabProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    loadTeamMembers();
  }, []);

  async function loadTeamMembers() {
    try {
      const response = await fetch(`/api/team/members`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function handleSendInvitation() {
    if (!inviteEmail) {
      setInviteMessage('❌ Please enter an email address');
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
          role: 'user' // Invited users are always 'user' role
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteMessage(`✅ Invitation sent to ${inviteEmail}!\n\nShare this link:\n${data.invitationLink}`);
      setInviteEmail('');
      loadTeamMembers();
    } catch (err: any) {
      console.error('Invitation error:', err);
      setInviteMessage(`❌ ${err.message}`);
    } finally {
      setInviteLoading(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const response = await fetch(`/api/team/members?id=${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Team member removed');
        loadTeamMembers();
      } else {
        alert('❌ Failed to remove team member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('❌ Error removing team member');
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite User Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h3>
        
        {inviteMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            inviteMessage.startsWith('✅') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="whitespace-pre-wrap">{inviteMessage}</div>
          </div>
        )}
        
        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
            disabled={inviteLoading}
          />
          <button
            onClick={handleSendInvitation}
            disabled={inviteLoading || !inviteEmail}
            className="bg-[#F95B14] text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviteLoading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Invited users will have basic access to the platform
        </p>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Team Members ({teamMembers.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {teamMembers.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm">No team members yet</p>
              <p className="text-xs mt-1">Invite colleagues to collaborate</p>
            </div>
          )}
          {teamMembers.map((member) => (
            <div key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F95B14] to-orange-600 flex items-center justify-center text-white font-semibold">
                  {(member.full_name || member.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.full_name || 'User'}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  member.role === 'org_admin' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {member.role === 'org_admin' ? 'Admin' : 'User'}
                </span>
                {member.role !== 'org_admin' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

