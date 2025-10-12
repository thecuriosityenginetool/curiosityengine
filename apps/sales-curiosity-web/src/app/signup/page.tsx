'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

function SignupForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleGoogleSignUp = async () => {
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleMicrosoftSignUp = async () => {
    await signIn('microsoft', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-20">
      {/* Centered Signup Form */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image 
            src="/fulllogo_transparent_nobuffer.png" 
            alt="Curiosity Engine" 
            width={200} 
            height={60}
            priority
          />
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          Start Your Journey
        </h1>
        
        {/* Tagline */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed text-center">
          Transform your sales productivity with AI that learns your voice and automates your outreach across LinkedIn, Salesforce, and email.
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            Authentication failed. Please try again.
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-4 mb-6">
          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          {/* Microsoft Sign Up */}
          <button
            onClick={handleMicrosoftSignUp}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
              <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
              <path fill="#f35325" d="M1 1h10v10H1z"/>
              <path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            Sign up with Microsoft
          </button>
        </div>

        {/* Terms */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            By signing up, I agree to Curiosity Engine's{' '}
            <a href="/terms" className="text-blue-600 underline hover:text-blue-800">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-blue-600 underline hover:text-blue-800">Privacy Policy</a>
            .
          </p>
        </div>

        {/* Info */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> By signing up with Google or Microsoft, you're granting Curiosity Engine permission to send emails on your behalf through the Chrome extension.
          </p>
        </div>

        {/* Divider */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-[#F95B14] hover:underline font-semibold">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
