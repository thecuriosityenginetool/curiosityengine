/**
 * Auth Bridge Content Script
 * Runs on curiosityengine.io to bridge authentication between web app and extension
 */

// Listen for auth data from the web page
window.addEventListener('message', async (event) => {
  // Only accept messages from our domain
  if (event.origin !== 'https://www.curiosityengine.io' && 
      event.origin !== 'http://localhost:3000') {
    return;
  }

  // Check if it's an extension auth message
  if (event.data.type === 'EXTENSION_AUTH' && event.data.authToken) {
    console.log('🔵 Auth bridge: Received auth data from web page');
    
    try {
      // Store in chrome.storage
      await chrome.storage.local.set({
        authToken: event.data.authToken,
        user: event.data.user,
      });

      console.log('✅ Auth bridge: Token stored in extension');

      // Send confirmation back to web page
      window.postMessage({
        type: 'EXTENSION_AUTH_SUCCESS',
        success: true,
      }, event.origin);

    } catch (error) {
      console.error('❌ Auth bridge: Error storing token:', error);
      
      window.postMessage({
        type: 'EXTENSION_AUTH_ERROR',
        error: String(error),
      }, event.origin);
    }
  }
});

// Signal to the page that the extension is ready
console.log('🔵 Auth bridge: Content script loaded');
window.postMessage({ type: 'EXTENSION_BRIDGE_READY' }, window.location.origin);

