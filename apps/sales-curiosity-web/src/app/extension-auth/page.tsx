'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ExtensionAuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Listen for confirmation from auth bridge
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'EXTENSION_AUTH_SUCCESS') {
        console.log('✅ Received confirmation from extension bridge');
        // Auto-close tab after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    async function handleExtensionAuth() {
      try {
        // Wait for session to load
        if (status === 'loading') {
          return;
        }

        if (status === 'unauthenticated' || !session?.user?.email) {
          // Not logged in - redirect to login with extension parameter
          router.push('/login?extension=true');
          return;
        }

        console.log('🔵 Extension auth: User authenticated', session.user.email);

        // Call the extension OAuth auth API to get token
        const response = await fetch('/api/extension/oauth-auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: session.user.email,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get extension auth token');
        }

        const data = await response.json();
        console.log('🔵 Extension auth token received');

        // Send auth data to extension via postMessage
        // The auth-bridge content script will receive this and store in chrome.storage
        window.postMessage({
          type: 'EXTENSION_AUTH',
          authToken: data.authToken,
          user: data.user,
        }, window.location.origin);

        console.log('✅ Extension auth complete - token sent to extension bridge');
        setAuthStatus('success');
      } catch (error) {
        console.error('❌ Extension auth error:', error);
        setErrorMessage(String(error));
        setAuthStatus('error');
      }
    }

    handleExtensionAuth();
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {authStatus === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Connecting Extension...
            </h1>
            <p className="text-gray-600">
              Please wait while we authenticate your extension
            </p>
          </>
        )}

        {authStatus === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ✅ Extension Connected!
            </h1>
            <p className="text-gray-600 mb-6">
              Your Chrome extension has been successfully authenticated.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>You can now close this tab</strong> and return to the extension.
              </p>
            </div>
            <button
              onClick={() => {
                // Try window.close() first, if it fails, show manual instruction
                try {
                  window.close();
                  // If window.close() didn't work, try alternative
                  setTimeout(() => {
                    window.location.href = 'about:blank';
                  }, 100);
                } catch (e) {
                  alert('Please manually close this tab (Ctrl+W or Cmd+W)');
                }
              }}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Close This Tab
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Or press Ctrl+W (Windows) / Cmd+W (Mac) to close
            </p>
          </>
        )}

        {authStatus === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Failed
            </h1>
            <p className="text-gray-600 mb-4">
              There was an error connecting your extension.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-red-800 font-mono">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => router.push('/login?extension=true')}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

