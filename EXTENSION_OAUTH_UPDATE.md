# Chrome Extension OAuth Update

## Overview

The Chrome extension currently has email/password login forms. This needs to be updated to match the web app's OAuth-only authentication (Google and Microsoft only).

## Changes Needed

### 1. Remove Email/Password Login UI

**File:** `apps/sales-curiosity-extension/src/popup.tsx`

**Lines to Replace:** Around lines 709-1115 (the entire login/signup form section)

**Replace with OAuth Buttons:**

```tsx
{/* OAuth Sign In */}
<div style={{
  padding: "0 4px"
}}>
  <p style={{
    fontSize: 13,
    color: "#64748b",
    marginBottom: 20,
    lineHeight: 1.6,
    textAlign: "center"
  }}>
    Sign in with your work email to access AI-powered sales intelligence
  </p>

  {/* Sign in with Google */}
  <button
    type="button"
    onClick={() => {
      // Open web app login page
      chrome.tabs.create({ url: `${apiBase}/login?extension=true` });
    }}
    style={{
      width: "100%",
      padding: "12px 16px",
      background: "white",
      border: "2px solid #e5e7eb",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      transition: "all 0.2s ease",
      color: "#1f2937"
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.background = "#f9fafb";
      e.currentTarget.style.borderColor = "#d1d5db";
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.background = "white";
      e.currentTarget.style.borderColor = "#e5e7eb";
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    Sign in with Google
  </button>

  {/* Sign in with Microsoft */}
  <button
    type="button"
    onClick={() => {
      // Open web app login page
      chrome.tabs.create({ url: `${apiBase}/login?extension=true` });
    }}
    style={{
      width: "100%",
      padding: "12px 16px",
      background: "white",
      border: "2px solid #e5e7eb",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      transition: "all 0.2s ease",
      color: "#1f2937"
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.background = "#f9fafb";
      e.currentTarget.style.borderColor = "#d1d5db";
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.background = "white";
      e.currentTarget.style.borderColor = "#e5e7eb";
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#f25022"/>
      <path d="M24 11.4H12.6V0H24v11.4z" fill="#7fba00"/>
      <path d="M11.4 24H0V12.6h11.4V24z" fill="#00a4ef"/>
      <path d="M24 24H12.6V12.6H24V24z" fill="#ffb900"/>
    </svg>
    Sign in with Microsoft
  </button>

  <div style={{
    marginTop: 20,
    padding: 16,
    background: "#fef3c7",
    border: "1px solid #fbbf24",
    borderRadius: 8,
    fontSize: 12,
    color: "#92400e",
    lineHeight: 1.5
  }}>
    <strong>👋 Note:</strong> After signing in on the web page, close that tab and return here. The extension will automatically connect.
  </div>

  <div style={{
    marginTop: 16,
    textAlign: "center",
    fontSize: 11,
    color: "#9ca3af"
  }}>
    By signing in, you agree to our Terms of Service and Privacy Policy
  </div>
</div>
```

---

### 2. Remove Unused State Variables

**Remove these state variables** (no longer needed):

```tsx
const [showLogin, setShowLogin] = useState<boolean>(true);
const [showPasswordReset, setShowPasswordReset] = useState<boolean>(false);
const [email, setEmail] = useState<string>("");
const [password, setPassword] = useState<string>("");
const [fullName, setFullName] = useState<string>("");
const [accountType, setAccountType] = useState<'individual' | 'organization'>('individual');
const [organizationName, setOrganizationName] = useState<string>("");
```

---

### 3. Remove Unused Handler Functions

**Remove these functions** (no longer needed):

```tsx
const handleLogin = async (e: React.FormEvent) => { ... }
const handleSignup = async (e: React.FormEvent) => { ... }
const handlePasswordReset = async (e: React.FormEvent) => { ... }
```

---

### 4. Update Brand Colors (Optional - Match Web App)

**Find and replace color references:**

- Blue gradient: `#0ea5e9` → `#F95B14` (Orange)
- Secondary blue: `#3b82f6` → `#e04d0a` (Darker orange)

**Or keep the blue** if you prefer the current branding.

---

## How It Works After Update

### User Flow:

1. User opens extension → Sees "not authenticated" screen
2. Clicks "Sign in with Google" or "Sign in with Microsoft"
3. **New tab opens** to `https://www.curiosityengine.io/login?extension=true`
4. User completes OAuth flow on web app
5. Web app stores session and redirects to success page
6. User **closes the tab** and returns to extension
7. Extension checks `chrome.storage.local` for auth token
8. If token exists and is valid → User is logged in!

### Technical Implementation:

The web app already has this implemented:
- When `?extension=true` parameter is present on login page
- After successful OAuth, the web app calls `/api/extension/oauth-auth` 
- This generates an extension auth token
- Token is stored in `chrome.storage.local`
- Extension reads token on next check

**No additional backend changes needed** - this flow is already built!

---

## Testing After Update

1. **Build extension:**
   ```bash
   cd apps/sales-curiosity-extension
   npm run build
   ```

2. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click reload button on "Sales Curiosity"

3. **Test login:**
   - Open extension
   - Click "Sign in with Google" or "Sign in with Microsoft"
   - Complete OAuth on web page
   - Close tab
   - Return to extension
   - Should show authenticated state

4. **Test Salesforce connection:**
   - Go to Settings → Integrations
   - Click "Connect Salesforce"
   - Complete Salesforce OAuth
   - Should show "Connected"

---

## Files to Update

1. **`apps/sales-curiosity-extension/src/popup.tsx`**
   - Remove email/password forms (lines ~709-1115)
   - Add OAuth buttons
   - Remove unused state variables
   - Remove unused handler functions

2. **Optional: Update Logo/Branding**
   - `apps/sales-curiosity-extension/src/components/Logo.tsx`
   - Change colors if desired

---

## Quick Fix Option

If manual editing is tedious, I can:
1. Create a new simplified `popup.tsx` file
2. You replace the entire file
3. Rebuild extension
4. Test

**Would you like me to create a complete replacement file?** It would be much faster than manual edits.

---

## Status

- [x] Salesforce OAuth configured in Salesforce
- [x] Salesforce credentials added to Vercel
- [x] Vercel redeployed
- [ ] Extension updated to OAuth-only login
- [ ] Extension rebuilt and reloaded
- [ ] Salesforce connection tested from extension

---

**Next step:** Update the extension popup.tsx file with OAuth buttons, then rebuild and test!

