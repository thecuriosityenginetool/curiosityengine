/**
 * Auth Bridge Content Script
 * Runs on curiosityengine.io to bridge authentication between web app and extension
 */

// Listen for auth data from the web page
window.addEventListener('message', async (event) => {
  // Only accept messages from our domain
  if (event.origin !== 'https://www.curiosityengine.io' && 
      event.origin !== 'http://localhost:3000') {
    console.log('🔵 Auth bridge: Ignoring message from', event.origin);
    return;
  }

  console.log('🔵 Auth bridge: Received message:', event.data.type);

  // Check if it's an extension auth message
  if (event.data.type === 'EXTENSION_AUTH' && event.data.authToken) {
    console.log('🔵 Auth bridge: Received auth data from web page');
    console.log('🔵 Auth bridge: Auth token:', event.data.authToken.substring(0, 20) + '...');
    console.log('🔵 Auth bridge: User:', event.data.user);
    
    try {
      // Store in chrome.storage
      await chrome.storage.local.set({
        authToken: event.data.authToken,
        user: event.data.user,
      });

      console.log('✅ Auth bridge: Token stored in extension');

      // Verify it was stored
      const stored = await chrome.storage.local.get(['authToken', 'user']);
      console.log('✅ Auth bridge: Verified storage:', !!stored.authToken, !!stored.user);

      // Send confirmation back to web page
      window.postMessage({
        type: 'EXTENSION_AUTH_SUCCESS',
        success: true,
      }, event.origin);

      // Show visual confirmation
      alert('✅ Extension authenticated! You can now close this tab and return to LinkedIn.');

    } catch (error) {
      console.error('❌ Auth bridge: Error storing token:', error);
      
      window.postMessage({
        type: 'EXTENSION_AUTH_ERROR',
        error: String(error),
      }, event.origin);

      alert('❌ Error: ' + String(error));
    }
  }
});

// Signal to the page that the extension is ready
console.log('🔵 Auth bridge: Content script loaded');
window.postMessage({ type: 'EXTENSION_BRIDGE_READY' }, window.location.origin);

