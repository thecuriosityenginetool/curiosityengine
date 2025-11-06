'use client';

import { useState } from 'react';

interface ProfileData {
  full_name: string;
  job_title: string;
  company_name: string;
  company_url: string;
}

interface UserContext {
  aboutMe: string;
  objectives: string;
}

interface ProfileTabProps {
  profileData: ProfileData;
  userContext: UserContext;
  onSaveProfile: (data: ProfileData) => Promise<void>;
  onSaveContext: (context: UserContext) => Promise<void>;
}

export default function ProfileTab({ 
  profileData, 
  userContext, 
  onSaveProfile, 
  onSaveContext 
}: ProfileTabProps) {
  const [localProfile, setLocalProfile] = useState(profileData);
  const [aboutMe, setAboutMe] = useState(userContext.aboutMe);
  const [objectives, setObjectives] = useState(userContext.objectives);

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={localProfile.full_name}
              onChange={(e) => setLocalProfile({...localProfile, full_name: e.target.value})}
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
              value={localProfile.job_title}
              onChange={(e) => setLocalProfile({...localProfile, job_title: e.target.value})}
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
              value={localProfile.company_name}
              onChange={(e) => setLocalProfile({...localProfile, company_name: e.target.value})}
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
              value={localProfile.company_url}
              onChange={(e) => setLocalProfile({...localProfile, company_url: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
              placeholder="https://acme.com"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={() => onSaveProfile(localProfile)}
            className="bg-[#F95B14] text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Save Profile
          </button>
        </div>
      </div>

      {/* AI Context */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Context</h3>
        <p className="text-sm text-gray-600 mb-4">
          This information will be used to personalize AI-generated responses
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              About Me
            </label>
            <textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              placeholder="Describe your role, company, and what you do..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none resize-none"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none resize-none"
            />
          </div>
          <button
            onClick={() => onSaveContext({ aboutMe, objectives })}
            className="bg-[#F95B14] text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Save Context
          </button>
        </div>
      </div>
    </div>
  );
}

