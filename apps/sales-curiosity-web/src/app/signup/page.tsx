'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

type AccountType = 'individual' | 'organization';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleGoogleSignup() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    }
  }

  async function handleMicrosoftSignup() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    }
  }

  useEffect(() => {
    // Check for message in URL
    const message = searchParams.get('message');
    if (message) {
      setInfoMessage(message);
    }
  }, [searchParams]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (accountType === 'organization' && !organizationName.trim()) {
      setError('Organization name is required');
      setLoading(false);
      return;
    }

    try {
      // Call our signup API which uses admin.createUser with email_confirm
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          accountType,
          organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login?message=Account created! Please sign in.');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Account Created!</h2>
          <p style={{ color: '#718096' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      {/* Centered Signup Form */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Image 
            src="/icononly_transparent_nobuffer.png" 
            alt="Curiosity Engine" 
            width={40}
            height={40}
            className="w-10 h-10 mx-auto mb-4"
          />
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Sign up for Curiosity Engine — free forever
        </h1>
        
        {/* Tagline */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed text-center">
          Transform your sales productivity with AI that learns your voice and automates your outreach across LinkedIn, Salesforce, and email.
        </p>

        {/* Terms */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-gray-700">
            By signing up, I agree to Curiosity Engine's{' '}
            <a href="/terms" className="text-blue-600 underline hover:text-blue-800">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-blue-600 underline hover:text-blue-800">Privacy Policy</a>
            .
          </p>
        </div>

        {/* Error/Info Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
            {infoMessage}
          </div>
        )}

        {/* Email Signup */}
        <form onSubmit={handleSignup} className="mb-8">
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F95B14] focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing up...' : 'Sign up for free'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center mb-6">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-4 text-gray-500 text-sm">or</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Social Login */}
        <p className="text-sm text-gray-600 mb-4 text-center">Verify your business email with Google or Microsoft</p>
        
        <div className="space-y-3 mb-8">
          <button
            onClick={handleGoogleSignup}
            className="w-full gsi-material-button"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{display: 'block'}}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign up with Google</span>
              <span style={{display: 'none'}}>Sign up with Google</span>
            </div>
          </button>

          <button
            onClick={handleMicrosoftSignup}
            className="w-full gsi-material-button"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <Image 
                  src="/Outlook_icon.svg" 
                  alt="Microsoft" 
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
              </div>
              <span className="gsi-material-button-contents">Sign up with Microsoft</span>
              <span style={{display: 'none'}}>Sign up with Microsoft</span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-6">
          <div className="flex items-center gap-1">
            <span>★★★★☆</span>
            <span>4.8/5 based on 1,247 reviews</span>
          </div>
          <span>|</span>
          <span>GDPR Compliant</span>
        </div>

        <div className="text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-[#F95B14] font-semibold hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ color: 'white' }}>Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}