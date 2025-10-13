# OAuth Setup Guide for Gmail & Outlook Integration

This guide will help you set up OAuth authentication with Google and Microsoft, enabling users to sign in with their Gmail or Outlook accounts and send emails from the Chrome extension.

## 📋 What Has Been Implemented

### ✅ Backend Changes Complete

1. **NextAuth Configuration** (`apps/sales-curiosity-web/src/lib/auth.ts`)
   - Removed Credentials provider (email/password)
   - Added Google OAuth provider
   - Added Microsoft OAuth provider
   - Configured proper scopes for email sending
   - Automatic user creation on first sign-in
   - OAuth token storage for email sending

2. **Database Schema** (`supabase-add-oauth-tokens.sql`)
   - Created `user_oauth_tokens` table
   - Stores access tokens, refresh tokens, and expiry
   - Proper RLS policies for security
   - Added `email_provider` column to users table

3. **API Routes Created**
   - `/api/email/send` - Send emails via Gmail or Outlook
   - `/api/email/draft` - Create email drafts via Gmail or Outlook
   - `/api/extension/oauth-auth` - Extension authentication endpoint
   - Automatic token refresh when expired

4. **Login/Signup Pages Updated**
   - `apps/sales-curiosity-web/src/app/login/page.tsx` - OAuth buttons only
   - `apps/sales-curiosity-web/src/app/signup/page.tsx` - OAuth buttons only
   - Beautiful UI with provider logos
   - Clear messaging about email permissions

5. **TypeScript Types Updated**
   - `apps/sales-curiosity-web/src/types/next-auth.d.ts`
   - Added OAuth token fields to session
   - Added provider tracking

## 🔧 Setup Steps

### Step 1: Run Database Migration

```bash
# Apply the OAuth tokens schema to your Supabase database
psql <your-database-connection-string> < supabase-add-oauth-tokens.sql
```

Or run this SQL in your Supabase dashboard:
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `supabase-add-oauth-tokens.sql`
3. Execute

### Step 2: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API and Gmail API
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
5. Configure consent screen:
   - Add your app name: "Curiosity Engine"
   - Add your email
   - Add scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.compose`
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://www.curiosityengine.io/api/auth/callback/google` (production)
7. Copy **Client ID** and **Client Secret**

### Step 3: Create Microsoft OAuth Credentials

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - Name: "Curiosity Engine"
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: 
     - Platform: **Web**
     - URI: `http://localhost:3000/api/auth/callback/microsoft` (development)
     - Add another: `https://www.curiosityengine.io/api/auth/callback/microsoft` (production)
5. After creation, go to **Certificates & secrets**
   - Create a new **Client secret**
   - Copy the **Value** (you won't see it again!)
6. Go to **API permissions**
   - Add permissions:
     - Microsoft Graph > Delegated permissions:
       - `openid`
       - `email`
       - `profile`
       - `offline_access`
       - `Mail.Send`
       - `Mail.ReadWrite`
   - Grant admin consent if needed
7. Copy **Application (client) ID** from Overview page

### Step 4: Set Environment Variables

Add these to your `.env.local` file in `apps/sales-curiosity-web/`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# NextAuth (keep existing)
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000  # or your production URL

# Supabase (keep existing)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Also add to Vercel environment variables if deploying to production.

### Step 5: Update Chrome Extension (Partially Complete)

The extension needs some manual updates since it's a large file:

#### Option A: Manual Update (Recommended)

1. Open `apps/sales-curiosity-extension/src/popup.tsx`
2. Find the auth form section (around line 650-1090)
3. Replace the entire email/password form with:

```tsx
{/* OAuth Authentication */}
<>
  <div style={{
    padding: "20px",
    background: "#f8fafc",
    borderRadius: 12,
    marginBottom: 20,
    border: "1px solid #e2e8f0"
  }}>
    <p style={{
      fontSize: 13,
      color: "#475569",
      marginBottom: 16,
      lineHeight: 1.6,
      margin: 0
    }}>
      Sign in with your Google or Microsoft account to unlock AI-powered LinkedIn intelligence and email automation.
    </p>
  </div>

  <button
    onClick={handleOAuthLogin}
    disabled={authLoading}
    style={{
      width: "100%",
      padding: "14px 16px",
      background: "white",
      color: "#1f2937",
      border: "2px solid #e5e7eb",
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 600,
      cursor: authLoading ? "not-allowed" : "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      transition: "all 0.2s ease",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10
    }}
    onMouseOver={(e) => {
      if (!authLoading) {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
      }
    }}
    onMouseOut={(e) => {
      if (!authLoading) {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      }
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    {authLoading ? "Opening..." : "Sign in with Google or Microsoft"}
  </button>

  <div style={{
    marginTop: 16,
    padding: "14px",
    background: "#eff6ff",
    borderRadius: 10,
    border: "1px solid #dbeafe"
  }}>
    <p style={{
      fontSize: 11,
      color: "#1e40af",
      margin: 0,
      lineHeight: 1.5
    }}>
      <strong>Note:</strong> You'll be redirected to our secure web app to sign in. After authentication, return here to use the extension.
    </p>
  </div>
</>
```

#### Option B: Use Provided Code

The functions `handleOAuthLogin` and `handleOAuthSignup` have already been added to your extension.
You just need to wire up the UI to call these functions.

### Step 6: Add Email Sending to Extension

Add these helper functions to `popup.tsx`:

```typescript
async function sendEmailFromExtension(to: string, subject: string, body: string) {
  try {
    const result = await chrome.storage.local.get(['authToken']);
    
    const res = await chrome.runtime.sendMessage({
      type: "PING_API",
      url: `${apiBase}/api/email/send`,
      method: "POST",
      authToken: result.authToken,
      body: {
        to,
        subject,
        body,
        bodyType: 'html'
      },
    });

    if (res.ok) {
      return { success: true, data: res.data };
    } else {
      return { success: false, error: res.data?.error || 'Failed to send email' };
    }
  } catch (err) {
    return { success: false, error: 'Connection error' };
  }
}

async function createEmailDraft(to: string, subject: string, body: string) {
  try {
    const result = await chrome.storage.local.get(['authToken']);
    
    const res = await chrome.runtime.sendMessage({
      type: "PING_API",
      url: `${apiBase}/api/email/draft`,
      method: "POST",
      authToken: result.authToken,
      body: {
        to,
        subject,
        body,
        bodyType: 'html'
      },
    });

    if (res.ok) {
      return { success: true, data: res.data };
    } else {
      return { success: false, error: res.data?.error || 'Failed to create draft' };
    }
  } catch (err) {
    return { success: false, error: 'Connection error' };
  }
}
```

## 🧪 Testing

### Test OAuth Sign-In

1. Start your dev server: `cd apps/sales-curiosity-web && npm run dev`
2. Visit `http://localhost:3000/login`
3. Click "Sign in with Google" or "Sign in with Microsoft"
4. Complete OAuth flow
5. You should be redirected to dashboard
6. Check your Supabase `user_oauth_tokens` table for stored tokens

### Test Email Sending

```typescript
// In your browser console or extension:
const response = await fetch('http://localhost:3000/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <your-session-token>'
  },
  body: JSON.stringify({
    to: 'recipient@example.com',
    subject: 'Test Email from Curiosity Engine',
    body: '<h1>Hello!</h1><p>This is a test email.</p>',
    bodyType: 'html'
  })
});

const data = await response.json();
console.log(data);
```

### Test Extension OAuth Flow

1. Load unpacked extension in Chrome
2. Click extension icon
3. Click "Sign in with Google or Microsoft"
4. Should open web app login page in new tab
5. Complete OAuth flow
6. Close tab and return to extension
7. Extension should recognize your authentication

## 🔒 Security Considerations

1. **Token Storage**
   - Access tokens are stored in Supabase with RLS policies
   - Only users can access their own tokens
   - Service role has full access for NextAuth callbacks

2. **Token Refresh**
   - Automatic refresh when tokens expire
   - Refresh tokens stored securely
   - Failed refresh requires re-authentication

3. **Scopes**
   - Minimal scopes requested (only email sending)
   - Users see clear permission requests
   - Can revoke access anytime from Google/Microsoft account settings

## 📝 User Flow

### First Time User

1. User installs Chrome extension
2. Clicks extension icon
3. Clicks "Sign in with Google or Microsoft"
4. Redirected to web app login page
5. Chooses Google or Microsoft
6. OAuth consent screen shows permissions
7. After approval, creates account automatically
8. Stores OAuth tokens for email sending
9. Redirected to dashboard
10. Returns to extension - now authenticated
11. Can now analyze LinkedIn profiles and send emails

### Returning User

1. User clicks extension icon
2. Extension checks stored auth token
3. If valid, shows main interface
4. If expired, shows login button again

## 🐛 Troubleshooting

### "No email provider connected" error

- User needs to sign in again via OAuth
- Check if tokens exist in `user_oauth_tokens` table
- Verify OAuth scopes include email permissions

### Token refresh fails

- Check refresh token exists and hasn't been revoked
- Verify OAuth client credentials are correct
- User may need to re-authorize the app

### OAuth redirect URI mismatch

- Ensure redirect URIs in Google/Microsoft console match exactly
- Include both `http://localhost:3000` and production URL
- Check for trailing slashes

## 🚀 Deployment Checklist

- [ ] Database migration applied to production
- [ ] Environment variables set in Vercel
- [ ] Google OAuth credentials configured with production URLs
- [ ] Microsoft OAuth credentials configured with production URLs
- [ ] Test OAuth flow in production
- [ ] Test email sending in production
- [ ] Extension updated and tested
- [ ] Extension submitted to Chrome Web Store

## 📚 API Documentation

### POST /api/email/send

Send an email via user's connected email provider.

**Request:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "body": "<html><body>Email content</body></html>",
  "bodyType": "html"
}
```

**Response:**
```json
{
  "success": true,
  "provider": "google",
  "result": { /* provider-specific response */ }
}
```

### POST /api/email/draft

Create an email draft via user's connected email provider.

**Request:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "body": "<html><body>Email content</body></html>",
  "bodyType": "html"
}
```

**Response:**
```json
{
  "success": true,
  "provider": "google",
  "draftId": "draft-id-from-provider",
  "result": { /* provider-specific response */ }
}
```

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review OAuth provider documentation
3. Check Supabase logs for errors
4. Review NextAuth debug logs (debug mode enabled)

---

**Last Updated:** October 12, 2025
**Version:** 1.0.0

