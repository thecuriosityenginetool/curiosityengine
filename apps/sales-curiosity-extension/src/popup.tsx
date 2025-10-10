import { useEffect, useState } from "react";
import React from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import { Logo, LogoSmall } from "./components/Logo";

type Page = "home" | "context" | "integrations";
type ActionType = "analyze" | "email";

interface UserContext {
  aboutMe: string;
  objectives: string;
}

function Popup() {
  const [apiBase, setApiBase] = useState<string>(
    (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
      "https://www.curiosityengine.io"
  );
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isLinkedIn, setIsLinkedIn] = useState<boolean>(false);
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<any>(null);
  
  // Navigation state
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [emailContext, setEmailContext] = useState<string>("");
  
  // User context state
  const [userContext, setUserContext] = useState<UserContext>({ aboutMe: "", objectives: "" });
  const [tempContext, setTempContext] = useState<UserContext>({ aboutMe: "", objectives: "" });
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(true); // true = login, false = signup
  const [showPasswordReset, setShowPasswordReset] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [accountType, setAccountType] = useState<'individual' | 'organization'>('individual');
  const [organizationName, setOrganizationName] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [authSuccess, setAuthSuccess] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  
  // Organization context
  const [organization, setOrganization] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [enabledIntegrations, setEnabledIntegrations] = useState<string[]>([]);
  
  // User stats
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    try {
      localStorage.setItem("apiBase", apiBase);
    } catch {}
  }, [apiBase]);

  // Check if user is authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const result = await chrome.storage.local.get(['authToken', 'user']);
        if (result.authToken && result.user) {
          // Verify token is still valid by calling an API
          const res = await chrome.runtime.sendMessage({
            type: "PING_API",
            url: `${apiBase}/api/user/stats`,
            method: "GET",
            authToken: result.authToken,
          });

          if (res.ok) {
            // Token is valid
            setIsAuthenticated(true);
            setUser(result.user);
          } else {
            // Token is invalid, clear storage
            console.log("Cached token is invalid, clearing storage");
            await chrome.storage.local.clear();
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (e) {
        console.error("Error checking auth:", e);
        // On error, clear storage to be safe
        await chrome.storage.local.clear();
      }
    }
    checkAuth();
  }, [apiBase]);

  // Load user context from storage
  useEffect(() => {
    async function loadContext() {
      try {
        const result = await chrome.storage.local.get(['userContext']);
        if (result.userContext) {
          setUserContext(result.userContext);
          setTempContext(result.userContext);
        }
      } catch (e) {
        console.error("Error loading context:", e);
      }
    }
    if (isAuthenticated) {
      loadContext();
    }
  }, [isAuthenticated]);

  // Load organization info when authenticated
  useEffect(() => {
    async function loadOrgInfo() {
      try {
        const { authToken } = await chrome.storage.local.get(['authToken']);
        if (!authToken) return;

        const res = await chrome.runtime.sendMessage({
          type: "PING_API",
          url: `${apiBase}/api/organization/integrations`,
          method: "GET",
          authToken,
        });

        if (res.ok && res.data) {
          setOrganization(res.data.organization);
          setUserRole(res.data.userRole || 'member');
          setEnabledIntegrations(res.data.enabledIntegrations || []);
        }
      } catch (e) {
        console.error("Error loading organization info:", e);
      }
    }
    if (isAuthenticated) {
      loadOrgInfo();
    }
  }, [isAuthenticated, apiBase]);

  // Load user stats when authenticated
  useEffect(() => {
    async function loadStats() {
      try {
        const { authToken } = await chrome.storage.local.get(['authToken']);
        if (!authToken) return;

        const res = await chrome.runtime.sendMessage({
          type: "PING_API",
          url: `${apiBase}/api/user/stats`,
          method: "GET",
          authToken,
        });

        if (res.ok && res.data) {
          setUserStats(res.data);
        }
      } catch (e) {
        console.error("Error loading stats:", e);
      }
    }
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated, apiBase, response]);

  // Sync tempContext with userContext when it changes
  useEffect(() => {
    setTempContext(userContext);
  }, [userContext]);

  // Save user context to storage and database
  async function saveUserContext(context: UserContext) {
    try {
      // Save to local storage
      await chrome.storage.local.set({ userContext: context });
      setUserContext(context);

      // Sync to database
      const { authToken } = await chrome.storage.local.get(['authToken']);
      if (authToken) {
        await chrome.runtime.sendMessage({
          type: "PING_API",
          url: `${apiBase}/api/user/context`,
          method: "PUT",
          body: { userContext: context },
          authToken,
        });
      }
    } catch (e) {
      console.error("Error saving context:", e);
    }
  }

  // Get current tab URL on mount
  useEffect(() => {
    async function getCurrentTab() {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (tab?.url) {
          setCurrentUrl(tab.url);
          setIsLinkedIn(tab.url.includes("linkedin.com"));
        }
      } catch (e) {
        console.error("Error getting current tab:", e);
      }
    }
    getCurrentTab();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
    const res = await chrome.runtime.sendMessage({
      type: "PING_API",
        url: `${apiBase}/api/auth/login`,
        method: "POST",
        body: { email, password },
      });

      if (res.ok && res.data?.user && res.data?.session) {
        await chrome.storage.local.set({
          authToken: res.data.session.access_token,
          user: res.data.user,
        });
        setIsAuthenticated(true);
        setUser(res.data.user);
        setEmail("");
        setPassword("");
      } else {
        const errorMsg = res.data?.error || "Login failed";
        // Check if it's an invalid credentials error - redirect to signup
        if (errorMsg.includes("Invalid") || errorMsg.includes("credentials") || 
            errorMsg.includes("not found") || errorMsg.includes("setup incomplete")) {
          setAuthError("");
          setAuthSuccess("Please create an account to get started");
          setShowLogin(false); // Switch to signup form
          setPassword(""); // Clear password but keep email
          setTimeout(() => setAuthSuccess(""), 5000);
        } else {
          setAuthError(errorMsg);
        }
      }
    } catch (err) {
      setAuthError("Connection error. Check your backend is running.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    // Validate organization name if organization account
    if (accountType === 'organization' && !organizationName.trim()) {
      setAuthError("Organization name is required for organization accounts");
      setAuthLoading(false);
      return;
    }

    try {
    const res = await chrome.runtime.sendMessage({
      type: "PING_API",
        url: `${apiBase}/api/auth/signup`,
        method: "POST",
        body: { 
          email, 
          password, 
          fullName,
          accountType,
          organizationName: accountType === 'organization' ? organizationName : undefined
        },
      });

      if (res.ok && res.data?.user) {
        setAuthError("");
        const message = accountType === 'organization' 
          ? "Organization created! You are now the admin. Please sign in."
          : "Account created successfully! Please sign in.";
        setAuthSuccess(message);
        setShowLogin(true);
        setEmail("");
        setPassword("");
        setFullName("");
        setAccountType('individual');
        setOrganizationName("");
        setTimeout(() => setAuthSuccess(""), 5000);
      } else {
        setAuthError(res.data?.error || "Signup failed");
      }
    } catch (err) {
      setAuthError("Connection error. Check your backend is running.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    // Clear ALL extension storage
    await chrome.storage.local.clear();
    setIsAuthenticated(false);
    setUser(null);
    setOrganization(null);
    setUserRole('member');
    setEnabledIntegrations([]);
    setUserStats(null);
    setUserContext({ aboutMe: "", objectives: "" });
    setResponse("");
    setActionType(null);
    setLinkedinUrl("");
    setEmailContext("");
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const res = await chrome.runtime.sendMessage({
        type: "PING_API",
        url: `${apiBase}/api/auth/reset-password`,
        method: "POST",
        body: { email },
      });

      if (res.ok) {
        setAuthSuccess("Password reset email sent! Check your inbox.");
        setTimeout(() => {
          setShowPasswordReset(false);
          setShowLogin(true);
          setAuthSuccess("");
        }, 4000);
      } else {
        setAuthError(res.data?.error || "Failed to send reset email");
      }
    } catch (err) {
      setAuthError("Connection error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function analyzeLinkedInPage(action: ActionType = "analyze") {
    if (!currentUrl) {
      setResponse("No URL detected");
      return;
    }

    setLoading(true);
    setResponse("Extracting profile data from page...");

    try {
      // First, extract the profile data from the page using content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (!tab || !tab.id) {
        throw new Error("No active tab found");
      }

      setResponse("Scraping LinkedIn profile...");

      // Extract profile data from the page
      let extractResponse;
      try {
        extractResponse = await chrome.tabs.sendMessage(tab.id, { 
          type: "EXTRACT_LINKEDIN_PROFILE" 
        });
      } catch (err) {
        // Content script might not be loaded, try to reload the page
        throw new Error(
          "Could not connect to the page. Please refresh the LinkedIn page and try again.\n\n" +
          "Tip: After installing or updating the extension, you need to refresh any open LinkedIn tabs."
        );
      }

      if (!extractResponse || !extractResponse.success) {
        throw new Error(
          extractResponse?.error || 
          "Failed to extract profile data. Please make sure you're on a LinkedIn profile page and refresh the page."
        );
      }

      // Check if we got any usable data
      const hasUsableData = extractResponse.data?.name || 
                           extractResponse.data?.headline || 
                           extractResponse.data?.fullPageText;
      
      if (!hasUsableData) {
        throw new Error(
          "Could not extract any profile information from the page. " +
          "Please scroll down on the LinkedIn profile to load more content, then try again."
        );
      }

      setResponse(action === "email" ? "Drafting email with AI..." : "Sending to AI for analysis...");

      // Get auth token
      const { authToken } = await chrome.storage.local.get(['authToken']);

      // Send the extracted data to your API for AI analysis
      const res = await chrome.runtime.sendMessage({
        type: "PING_API",
        url: `${apiBase}/api/prospects`,
        method: "POST",
        body: {
          profileData: extractResponse.data,
          linkedinUrl: currentUrl,
          action: action,
          userContext: userContext,
          emailContext: action === "email" ? emailContext : undefined,
        },
        authToken,
      });

      if (res.ok && res.data?.analysis) {
        setResponse(res.data.analysis);
        setProfileData(res.data.profileData || extractResponse.data);
        
        // Show Salesforce status if available
        if (res.data.salesforceStatus) {
          const sfStatus = res.data.salesforceStatus;
          if (sfStatus.found) {
            setResponse(prev => 
              `🔗 **Salesforce Status:** Found as ${sfStatus.type} in your CRM\n\n` + prev
            );
          } else if (sfStatus.inCRM === false) {
            setResponse(prev => 
              `➕ **Salesforce Status:** New contact added to your CRM\n\n` + prev
            );
          }
        }
        
        setActionType(null);
        setEmailContext("");
      } else if (res.error) {
        throw new Error(`API Error: ${res.error}`);
      } else {
        setResponse(JSON.stringify(res, null, 2));
      }
    } catch (e) {
      setResponse(`❌ Error: ${String(e)}\n\nTroubleshooting:\n1. Refresh this LinkedIn page\n2. Reload the extension at chrome://extensions/\n3. Make sure your backend is running at ${apiBase}`);
    } finally {
      setLoading(false);
    }
  }

  function exportAsText() {
    if (!response) return;
    const blob = new Blob([response], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profileData?.name || 'linkedin'}-analysis.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportAsPDF() {
    if (!response) return;

    try {
      const doc = new jsPDF('p', 'pt', 'letter');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let yPos = 40;

      // Helper to add text with word wrap
      const addText = (text: string, fontSize: number, color: string, bold: boolean = false, indent: number = 0) => {
        doc.setFontSize(fontSize);
        doc.setTextColor(color);
        if (bold) doc.setFont('helvetica', 'bold');
        else doc.setFont('helvetica', 'normal');
        
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - indent);
        lines.forEach((line: string) => {
          if (yPos > doc.internal.pageSize.getHeight() - 60) {
            doc.addPage();
            yPos = 40;
          }
          doc.text(line, margin + indent, yPos);
          yPos += fontSize * 1.4;
        });
      };

      // Header with blue background
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 100, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Sales Intelligence Report', margin, 45);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('AI-Powered LinkedIn Analysis by Sales Curiosity', margin, 70);
      
      yPos = 130;

      // Profile Information Box
      doc.setDrawColor(14, 165, 233);
      doc.setLineWidth(3);
      doc.line(margin, yPos, margin, yPos + 100);
      doc.setFillColor(240, 249, 255);
      doc.rect(margin, yPos, pageWidth - margin * 2, 100, 'F');
      
      yPos += 20;
      addText('Profile Information', 14, '#0ea5e9', true);
      yPos += 10;
      addText(`Name: ${profileData?.name || 'N/A'}`, 10, '#4b5563');
      addText(`Headline: ${profileData?.headline || 'N/A'}`, 10, '#4b5563');
      addText(`Location: ${profileData?.location || 'N/A'}`, 10, '#4b5563');
      addText(`Generated: ${new Date().toLocaleString()}`, 10, '#64748b');
      
      yPos += 30;

      // Content
      response.split('\n').forEach((line) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          yPos += 15;
          addText(line.replace(/\*\*/g, ''), 14, '#0ea5e9', true);
          yPos += 5;
        } else if (line.startsWith('• ') || line.startsWith('- ')) {
          addText('•  ' + line.substring(2), 10, '#334155', false, 10);
        } else if (line.trim() && line.trim() !== '---') {
          addText(line, 10, '#475569');
        } else if (line.trim() === '---') {
          yPos += 10;
        }
      });

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 30;
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated by Sales Curiosity Extension • ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );

      // Download
      doc.save(`${profileData?.name || 'linkedin'}-analysis.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF. Please try TXT export instead.');
    }
  }

  async function exportAsDOCX() {
    if (!response) return;

    try {
      // Get auth token
      const { authToken } = await chrome.storage.local.get(['authToken']);

      // Send to backend to generate DOCX
      const res = await chrome.runtime.sendMessage({
        type: "PING_API",
        url: `${apiBase}/api/export/docx`,
        method: "POST",
        body: {
          analysis: response,
          profileData,
          linkedinUrl: currentUrl,
        },
        authToken,
      });

      if (res.ok && res.data?.docxBase64) {
        // Convert base64 to blob and download
        const binaryString = atob(res.data.docxBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${profileData?.name || 'linkedin'}-analysis.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to generate DOCX');
      }
    } catch (error) {
      console.error('DOCX generation error:', error);
      alert('Error generating DOCX. Please try TXT or PDF export instead.');
    }
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif",
        width: 420,
        minHeight: 500,
        maxHeight: 600,
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Auth Header */}
        <div style={{
          background: "white",
          padding: "24px",
          borderBottom: "1px solid #e5e7eb"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              marginBottom: 12,
              display: "inline-flex",
              borderRadius: 14,
              boxShadow: "0 6px 16px rgba(14, 165, 233, 0.3)"
            }}>
              <Logo size={56} />
            </div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 6px 0",
              color: "#0f172a"
            }}>
              Sales Curiosity
            </h1>
            <p style={{
              fontSize: 13,
              color: "#64748b",
              margin: 0
            }}>
              {showPasswordReset ? 'Reset Your Password' : 'AI-Powered LinkedIn Intelligence'}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <div style={{ 
          padding: "24px",
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden"
        }}>
          {authError && (
            <div style={{
              padding: "12px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
              border: "1px solid #fecaca"
            }}>
              {authError}
            </div>
          )}

          {authSuccess && (
            <div style={{
              padding: "12px",
              background: "#d1fae5",
              color: "#065f46",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
              border: "1px solid #6ee7b7"
            }}>
              ✓ {authSuccess}
            </div>
          )}

          {showPasswordReset ? (
            /* Password Reset Form */
            <form onSubmit={handlePasswordReset}>
              <p style={{
                fontSize: 13,
                color: "#475569",
                marginBottom: 16,
                lineHeight: 1.5
              }}>
                Enter your email address and we'll send you instructions to reset your password.
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#0f172a"
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    outline: "none",
                    transition: "all 0.2s ease",
                    boxSizing: "border-box",
                    background: "white"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0ea5e9";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(14, 165, 233, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: authLoading 
                    ? "#94a3b8" 
                    : "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: authLoading ? "not-allowed" : "pointer",
                  boxShadow: authLoading ? "none" : "0 4px 16px rgba(14, 165, 233, 0.4)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  letterSpacing: "0.3px"
                }}
                onMouseOver={(e) => {
                  if (!authLoading) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(14, 165, 233, 0.5)";
                  }
                }}
                onMouseOut={(e) => {
                  if (!authLoading) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(14, 165, 233, 0.4)";
                  }
                }}
              >
                {authLoading ? "Sending..." : "Send Reset Link"}
              </button>

              <div style={{
                marginTop: 16,
                textAlign: "center",
                fontSize: 12,
                color: "#64748b"
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setShowLogin(true);
                    setAuthError("");
                    setAuthSuccess("");
                    setEmail("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0ea5e9",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 0
                  }}
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            /* Login/Signup Form */
            <>
            <form onSubmit={showLogin ? handleLogin : handleSignup}>
            {!showLogin && (
              <>
              {/* Account Type Selection */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#0f172a"
                }}>
                  Account Type
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setAccountType('individual')}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: accountType === 'individual' ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                      borderRadius: 8,
                      background: accountType === 'individual' ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>👤</div>
                    <div style={{ 
                      fontWeight: 600, 
                      color: accountType === 'individual' ? '#0ea5e9' : '#0f172a'
                    }}>
                      Individual
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAccountType('organization')}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: accountType === 'organization' ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                      borderRadius: 8,
                      background: accountType === 'organization' ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>🏢</div>
                    <div style={{ 
                      fontWeight: 600, 
                      color: accountType === 'organization' ? '#0ea5e9' : '#0f172a'
                    }}>
                      Organization
                    </div>
                  </button>
                </div>
              </div>

              {/* Organization Name (conditional) */}
              {accountType === 'organization' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "#0f172a"
                  }}>
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                    placeholder="Acme Corp"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "2px solid #e2e8f0",
                      borderRadius: 10,
                      fontSize: 14,
                      outline: "none",
                      transition: "all 0.2s ease",
                      boxSizing: "border-box",
                      background: "white"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#0ea5e9";
                      e.currentTarget.style.boxShadow = "0 0 0 4px rgba(14, 165, 233, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#e2e8f0";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#0f172a"
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                    outline: "none",
                    transition: "all 0.2s ease",
                    boxSizing: "border-box",
                    background: "white"
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0ea5e9";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(14, 165, 233, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
              </>
            )}

              <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                  fontSize: 13,
                fontWeight: 600,
                  marginBottom: 8,
                  color: "#0f172a"
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: "100%",
                    padding: "12px 14px",
                    border: "2px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 14,
                  outline: "none",
                    transition: "all 0.2s ease",
                    boxSizing: "border-box",
                    background: "white"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#0ea5e9";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(14, 165, 233, 0.1)";
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "#0f172a"
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
                  background: "white"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#0ea5e9";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(14, 165, 233, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {!showLogin && (
                <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0 0" }}>
                  At least 6 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: "100%",
                padding: "14px",
                background: authLoading 
                  ? "#94a3b8" 
                  : "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: authLoading ? "not-allowed" : "pointer",
                boxShadow: authLoading ? "none" : "0 4px 16px rgba(14, 165, 233, 0.4)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                letterSpacing: "0.3px"
              }}
              onMouseOver={(e) => {
                if (!authLoading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(14, 165, 233, 0.5)";
                }
              }}
              onMouseOut={(e) => {
                if (!authLoading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(14, 165, 233, 0.4)";
                }
              }}
            >
              {authLoading ? "Please wait..." : (showLogin ? "Sign In" : "Create Account")}
            </button>
          </form>

          {showLogin && (
            <div style={{
              marginTop: 12,
              textAlign: "center",
              fontSize: 12
            }}>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordReset(true);
                  setShowLogin(false);
                  setAuthError("");
                  setAuthSuccess("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                  textDecoration: "underline"
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          <div style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 12,
            color: "#64748b"
          }}>
            {showLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setShowLogin(!showLogin);
                setShowPasswordReset(false);
                setAuthError("");
                setAuthSuccess("");
                setEmail("");
                setPassword("");
                setFullName("");
                setAccountType('individual');
                setOrganizationName("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#0ea5e9",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                fontSize: 12,
                padding: 0
              }}
            >
              {showLogin ? "Sign up" : "Sign in"}
            </button>
          </div>

          {/* Troubleshooting: Clear Cache */}
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #e5e7eb",
            textAlign: "center"
          }}>
            <p style={{
              fontSize: 11,
              color: "#94a3b8",
              marginBottom: 8
            }}>
              Having login issues?
            </p>
            <button
              type="button"
              onClick={async () => {
                await chrome.storage.local.clear();
                setAuthError("");
                setAuthSuccess("✓ Cache cleared! Please try logging in again.");
                setTimeout(() => setAuthSuccess(""), 3000);
              }}
              style={{
                background: "none",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                fontSize: 11,
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              🔄 Clear Cache & Retry
            </button>
          </div>
          </>
          )}
        </div>
      </div>
    );
  }

  // Home Page Component
  const renderHomePage = () => {
    if (!isLinkedIn) {
  return (
      <div style={{
        background: "white",
          padding: "20px",
          borderRadius: 12,
          border: "2px solid #fbbf24",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)"
        }}>
            <div style={{
              display: "flex",
              alignItems: "center",
            gap: 12,
            marginBottom: 12
          }}>
            <div style={{ fontSize: 24 }}>⚠️</div>
            <strong style={{
              fontSize: 14,
              color: "#92400e",
              fontWeight: 700
            }}>
              Not a LinkedIn Page
            </strong>
          </div>
              <p style={{
                margin: 0,
            fontSize: 13,
            color: "#78350f",
            lineHeight: 1.6
              }}>
            Please navigate to a LinkedIn profile page to analyze it with AI-powered insights.
              </p>
            </div>
      );
    }

    return (
          <>
            {/* URL Display Card */}
            <div style={{
              background: "white",
              padding: "16px",
              borderRadius: 12,
              marginBottom: 16,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8
              }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "#0077b5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "white"
                }}>
                  in
                </div>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0f172a"
                }}>
                  LinkedIn Profile Detected
                </span>
              </div>
              <div style={{
                fontSize: 11,
                color: "#64748b",
                wordBreak: "break-all",
                lineHeight: 1.5,
                paddingLeft: 32
              }}>
                {currentUrl}
              </div>
            </div>

        {/* User Stats Card */}
        {userStats && !actionType && !response && (
          <div style={{
            background: "white",
            padding: "16px",
            borderRadius: 12,
            marginBottom: 16,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e5e7eb"
          }}>
            <h3 style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 12px 0"
            }}>
              {userStats.teamStats ? '📊 Team Activity' : '📈 Your Activity'}
            </h3>

            {/* Individual/Member Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: userStats.teamStats ? 12 : 0
            }}>
              <div style={{
                background: "#f0f9ff",
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #bae6fd"
              }}>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#0284c7",
                  marginBottom: 2
                }}>
                  {userStats.userStats?.analysesCount || 0}
                </div>
                <div style={{
                  fontSize: 10,
                  color: "#0c4a6e",
                  fontWeight: 600
                }}>
                  Profile{userStats.userStats?.analysesCount === 1 ? '' : 's'} Analyzed
                </div>
              </div>

              <div style={{
                background: "#f0fdf4",
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #bbf7d0"
              }}>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#16a34a",
                  marginBottom: 2
                }}>
                  {userStats.userStats?.emailsCount || 0}
                </div>
                <div style={{
                  fontSize: 10,
                  color: "#14532d",
                  fontWeight: 600
                }}>
                  Email{userStats.userStats?.emailsCount === 1 ? '' : 's'} Drafted
                </div>
              </div>
            </div>

            {/* Team Stats for Org Admins */}
            {userStats.teamStats && (
              <>
                <div style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 12,
                  marginTop: 12
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#64748b",
                    marginBottom: 8
                  }}>
                    Team Overview
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#8b5cf6"
                      }}>
                        {userStats.teamStats.activeMembers}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: "#64748b"
                      }}>
                        Member{userStats.teamStats.activeMembers === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#0284c7"
                      }}>
                        {userStats.teamStats.totalAnalyses}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: "#64748b"
                      }}>
                        Total Analyses
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#16a34a"
                      }}>
                        {userStats.teamStats.totalEmails}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: "#64748b"
                      }}>
                        Total Emails
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Recent Activity */}
            {userStats.userStats?.recentAnalyses && userStats.userStats.recentAnalyses.length > 0 && (
              <div style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: 10,
                marginTop: 10
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 6
                }}>
                  Recent Analyses
                </div>
                {userStats.userStats.recentAnalyses.map((analysis: any, idx: number) => (
                  <div key={idx} style={{
                    fontSize: 10,
                    color: "#475569",
                    marginBottom: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    <span style={{ color: "#0ea5e9" }}>•</span>
                    {analysis.profile_name || 'Unknown'}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Selection */}
        {!actionType && !response && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => setActionType("analyze")}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(14, 165, 233, 0.35)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10
              }}
              onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(14, 165, 233, 0.4)";
              }}
              onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(14, 165, 233, 0.35)";
              }}
            >
              <span style={{ fontSize: 20 }}>🔍</span>
              <span>Analyze Profile</span>
            </button>

            <button
              onClick={() => setActionType("email")}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(139, 92, 246, 0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(139, 92, 246, 0.35)";
              }}
            >
              <span style={{ fontSize: 20 }}>✉️</span>
              <span>Draft Email</span>
            </button>
          </div>
        )}

        {/* Email Context Input */}
        {actionType === "email" && !response && (
          <div style={{
            background: "white",
            padding: "20px",
            borderRadius: 12,
            marginTop: 16,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e5e7eb"
          }}>
            <label style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#0f172a",
              marginBottom: 8
            }}>
              Email Context (Optional)
            </label>
            <p style={{
              fontSize: 11,
              color: "#64748b",
              marginBottom: 12,
              lineHeight: 1.5
            }}>
              Add specific context about how you'd like to approach this email or anything specific you want to mention.
            </p>
            <textarea
              value={emailContext}
              onChange={(e) => setEmailContext(e.target.value)}
              placeholder="E.g., I want to highlight our new product features, focus on solving their pain points around healthcare documentation..."
              style={{
                width: "100%",
                minHeight: 100,
                padding: "12px",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#0ea5e9";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14, 165, 233, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => analyzeLinkedInPage("email")}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: loading 
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 4px 14px rgba(139, 92, 246, 0.35)"
                }}
              >
                {loading ? "Drafting..." : "Generate Email"}
              </button>
              <button
                onClick={() => {
                  setActionType(null);
                  setEmailContext("");
                }}
                disabled={loading}
                style={{
                  padding: "12px 20px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Analyze Confirmation */}
        {actionType === "analyze" && !response && (
          <div style={{
            background: "white",
            padding: "20px",
            borderRadius: 12,
            marginTop: 16,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e5e7eb"
          }}>
            <p style={{
              fontSize: 13,
              color: "#475569",
              marginBottom: 16,
              lineHeight: 1.6
            }}>
              Ready to analyze this LinkedIn profile with AI insights?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => analyzeLinkedInPage("analyze")}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: loading 
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 4px 14px rgba(14, 165, 233, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }} />
                    Analyzing...
                </>
              ) : (
                  "Start Analysis"
              )}
            </button>
              <button
                onClick={() => setActionType(null)}
                disabled={loading}
                style={{
                  padding: "12px 20px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
              fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Response Card */}
        {response && (
          <div style={{
            marginTop: 16,
            background: "white",
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            animation: "slideIn 0.3s ease"
          }}>
            {/* Response Header */}
            <div style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
              padding: "12px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <strong style={{
                  fontSize: 13,
                  color: "white",
                  fontWeight: 700,
                  letterSpacing: "0.2px"
                }}>
                  AI Results
                </strong>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={exportAsText}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    transition: "all 0.2s ease",
                    fontWeight: 600
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  }}
                  title="Export as TXT"
                >
                  📄 TXT
                </button>
                <button
                  onClick={exportAsPDF}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    transition: "all 0.2s ease",
                    fontWeight: 600
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  }}
                  title="Export as PDF"
                >
                  📑 PDF
                </button>
                <button
                  onClick={exportAsDOCX}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    transition: "all 0.2s ease",
                    fontWeight: 600
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  }}
                  title="Export as DOCX"
                >
                  📝 DOCX
                </button>
                <button
                  onClick={() => {
                    setResponse("");
                    setActionType(null);
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: "4px 8px",
                    borderRadius: 6,
                    lineHeight: 1,
                    transition: "all 0.2s ease",
                    fontWeight: 700
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  }}
                  title="Clear"
                >
                  ×
        </button>
              </div>
            </div>

            {/* Response Content */}
            <div style={{
              padding: "20px",
              fontSize: 13,
              lineHeight: "1.7",
              color: "#0f172a",
              maxHeight: 450,
              overflow: "auto",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif"
            }}>
              {response.split('\n').map((line, i) => {
                // Clean line: remove ###, **, and other markdown
                let cleanLine = line.trim();
                
                // Handle headers: ### Title or **Title**
                if (cleanLine.startsWith('###') || cleanLine.startsWith('##') || cleanLine.startsWith('#')) {
                  cleanLine = cleanLine.replace(/^#{1,6}\s*/, '');
                  return (
                    <h3 key={i} style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#0ea5e9",
                      marginTop: i === 0 ? 0 : 20,
                      marginBottom: 12,
                      letterSpacing: "0.3px",
                      borderBottom: "2px solid #e0f2fe",
                      paddingBottom: 8
                    }}>
                      {cleanLine.replace(/\*\*/g, '')}
                    </h3>
                  );
                }
                
                // Handle **Subject:** and **Email:** patterns
                if (cleanLine.startsWith('**') && cleanLine.includes(':**')) {
                  const text = cleanLine.replace(/\*\*/g, '');
                  return (
                    <h4 key={i} style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginTop: 16,
                      marginBottom: 10,
                      letterSpacing: "0.2px"
                    }}>
                      {text}
                    </h4>
                  );
                }
                
                // Handle numbered items with bold: 1. **Title**: Content
                if (/^\d+\.\s*\*\*/.test(cleanLine)) {
                  const match = cleanLine.match(/^(\d+)\.\s*\*\*([^*]+)\*\*:?\s*(.*)/);
                  if (match) {
                    const [, num, title, content] = match;
                  return (
                    <div key={i} style={{
                        marginBottom: 14,
                        paddingLeft: 12,
                        borderLeft: "3px solid #0ea5e9",
                        paddingTop: 8,
                        paddingBottom: 8,
                        background: "#f8fafc"
                      }}>
                        <div style={{
                        fontWeight: 700,
                          color: "#0ea5e9",
                          marginBottom: content ? 6 : 0,
                          fontSize: 14
                        }}>
                          {num}. {title}
                        </div>
                        {content && (
                          <div style={{
                            color: "#475569",
                            lineHeight: 1.6,
                            paddingLeft: 8
                          }}>
                            {content}
                          </div>
                        )}
                      </div>
                    );
                  }
                }
                
                // Handle regular numbered items: 1. Text
                if (/^\d+\.\s+/.test(cleanLine) && !cleanLine.includes('**')) {
                  return (
                    <div key={i} style={{
                      marginBottom: 10,
                      paddingLeft: 12,
                        color: "#334155",
                      fontWeight: 500,
                        lineHeight: 1.6
                      }}>
                      {cleanLine.replace(/\*\*/g, '')}
                    </div>
                  );
                }
                
                // Handle bullet points: • or -
                if (cleanLine.startsWith('• ') || cleanLine.startsWith('- ')) {
                  const text = cleanLine.substring(2).replace(/\*\*/g, '');
                  return (
                    <div key={i} style={{
                      display: "flex",
                      gap: 12,
                      marginBottom: 10,
                      paddingLeft: 8
                    }}>
                      <span style={{
                        color: "#0ea5e9",
                        fontWeight: 700,
                        fontSize: 16,
                        lineHeight: 1.5,
                        minWidth: 16
                      }}>
                        •
                      </span>
                      <span style={{
                        flex: 1,
                        color: "#334155",
                        lineHeight: 1.6
                      }}>
                        {text}
                      </span>
                    </div>
                  );
                }
                
                // Handle dividers
                if (cleanLine === '---' || cleanLine === '___') {
                  return (
                    <hr key={i} style={{
                      border: "none",
                      borderTop: "2px solid #e5e7eb",
                      margin: "20px 0"
                    }} />
                  );
                }
                
                // Handle regular text with inline bold
                if (cleanLine && cleanLine.includes('**')) {
                  const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={i} style={{
                      margin: "0 0 10px 0",
                      color: "#475569",
                      lineHeight: 1.7
                    }}>
                      {parts.map((part, idx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <strong key={idx} style={{ 
                              color: "#0f172a",
                              fontWeight: 600 
                            }}>
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        return part;
                      })}
                    </p>
                  );
                }
                
                // Handle regular text
                if (cleanLine) {
                  return (
                    <p key={i} style={{
                      margin: "0 0 10px 0",
                      color: "#475569",
                      lineHeight: 1.7
                    }}>
                      {cleanLine}
                    </p>
                  );
                }
                
                return <br key={i} />;
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  // Context Page Component
  const renderContextPage = () => {
    const handleSave = async () => {
      setSaving(true);
      await saveUserContext(tempContext);
      setSaveMessage("✓ Context saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
      setSaving(false);
    };

    return (
      <div style={{
        background: "white",
        padding: "24px",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 8px 0"
          }}>
            Your Context
          </h2>
          <p style={{
            fontSize: 12,
            color: "#64748b",
            margin: 0,
            lineHeight: 1.5
          }}>
            This information will be used to personalize AI-generated analyses and emails.
          </p>
      </div>

        {saveMessage && (
          <div style={{
            padding: "12px",
            background: "#d1fae5",
            color: "#065f46",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 12,
            border: "1px solid #6ee7b7"
          }}>
            {saveMessage}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 8
          }}>
            About Me
          </label>
          <p style={{
            fontSize: 11,
            color: "#64748b",
            marginBottom: 8,
            lineHeight: 1.5
          }}>
            Describe your role, company, and what you do.
          </p>
          <textarea
            value={tempContext.aboutMe}
            onChange={(e) => setTempContext({ ...tempContext, aboutMe: e.target.value })}
            placeholder="E.g., I'm a Sales Director at TechCorp, specializing in enterprise healthcare solutions..."
            style={{
              width: "100%",
              minHeight: 100,
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0ea5e9";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14, 165, 233, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "#0f172a",
            marginBottom: 8
          }}>
            My Objectives
          </label>
          <p style={{
            fontSize: 11,
            color: "#64748b",
            marginBottom: 8,
            lineHeight: 1.5
          }}>
            What are your sales goals and what you're looking to achieve?
          </p>
          <textarea
            value={tempContext.objectives}
            onChange={(e) => setTempContext({ ...tempContext, objectives: e.target.value })}
            placeholder="E.g., Looking to connect with healthcare decision-makers, build relationships with CMOs and CTOs, increase product adoption..."
            style={{
              width: "100%",
              minHeight: 100,
              padding: "12px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#0ea5e9";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(14, 165, 233, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#cbd5e1";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "12px",
            background: saving 
              ? "#94a3b8"
              : "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: saving ? "none" : "0 4px 14px rgba(14, 165, 233, 0.35)",
            transition: "all 0.2s ease"
          }}
        >
          {saving ? "Saving..." : "Save Context"}
        </button>
      </div>
    );
  };

  // Integrations Page Component
  const renderIntegrationsPage = () => {
    const isIndividual = organization && organization.account_type === 'individual';
    const isOrgMember = organization && organization.account_type === 'organization';
    const isOrgAdmin = isOrgMember && userRole === 'org_admin';

    return (
      <div>
        <div style={{
          background: "white",
          padding: "24px",
          borderRadius: 12,
          marginBottom: 16,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb"
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 8px 0"
          }}>
            Integrations
          </h2>
          <p style={{
            fontSize: 12,
            color: "#64748b",
            margin: 0,
            lineHeight: 1.5
          }}>
            {isIndividual 
              ? `Connect your tools to streamline your workflow.`
              : isOrgAdmin
              ? `Manage integrations for your organization from the web dashboard.`
              : `Your organization admin manages which integrations are available to your team.`}
          </p>
        </div>

        {/* Admin link for org admins */}
        {isOrgAdmin && (
          <div style={{
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 12,
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span>Enable integrations for your team</span>
            <a
              href={`${apiBase}/admin/organization`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                padding: "4px 10px",
                background: "#3b82f6",
                color: "white",
                borderRadius: 6,
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              Open Dashboard
            </a>
          </div>
        )}

        {/* Org member status */}
        {isOrgMember && !isOrgAdmin && enabledIntegrations.length > 0 && (
          <div style={{
            background: "#d1fae5",
            border: "1px solid #6ee7b7",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 12,
            color: "#065f46"
          }}>
            ✓ Your organization has <strong>{enabledIntegrations.length}</strong> integration{enabledIntegrations.length !== 1 ? 's' : ''} enabled: {enabledIntegrations.join(', ')}
            
            {/* Salesforce status */}
            {enabledIntegrations.includes('salesforce') && (
              <div style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid #6ee7b7'
              }}>
                <strong>🔗 Salesforce Connected:</strong> Emails will be tailored based on CRM data
              </div>
            )}
          </div>
        )}

        {/* Salesforce Integration - Available for ALL Users */}
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: 12,
            marginBottom: 12,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #00A1E0 0%, #0176D3 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20
                }}>
                  ☁️
                </div>
                <div>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 2px 0"
                  }}>
                    Salesforce CRM
                  </h3>
                  <p style={{
                    fontSize: 11,
                    color: "#64748b",
                    margin: 0
                  }}>
                    Auto-check contacts & tailor emails
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: 11,
                padding: "4px 10px",
                background: enabledIntegrations.includes('salesforce_user') ? "#d1fae5" : "#fef3c7",
                color: enabledIntegrations.includes('salesforce_user') ? "#065f46" : "#92400e",
                borderRadius: 6,
                fontWeight: 600
              }}>
                {enabledIntegrations.includes('salesforce_user') ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 12,
              lineHeight: 1.5
            }}>
              {enabledIntegrations.includes('salesforce_user') 
                ? "Your Salesforce is connected. Emails are automatically tailored based on CRM data."
                : "Connect your Salesforce to check if prospects exist and auto-add new contacts."}
            </p>
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                  console.log('🔵 Button clicked!');
                  console.log('🔵 API Base:', apiBase);
                  
                  const { authToken } = await chrome.storage.local.get(['authToken']);
                  console.log('🔵 Auth token exists:', !!authToken);
                  
                  if (!authToken) {
                    alert('❌ Please log in to the extension first');
                    return;
                  }
                  
                  const url = `${apiBase}/api/salesforce/auth-user`;
                  console.log('🔵 Calling API:', url);
                  
                  const res = await chrome.runtime.sendMessage({
                    type: "PING_API",
                    url: url,
                    method: "GET",
                    authToken,
                  });
                  
                  console.log('🔵 API Response:', JSON.stringify(res, null, 2));
                  console.log('🔵 res.ok:', res.ok);
                  console.log('🔵 res.data:', res.data);
                  console.log('🔵 res.data?.authUrl:', res.data?.authUrl);
                  console.log('🔵 Condition check:', res.ok, '&&', res.data?.authUrl, '=', (res.ok && res.data?.authUrl));
                  
                  // Extract authUrl directly
                  const authUrl = res.data?.authUrl;
                  console.log('🔵 Extracted authUrl:', authUrl);
                  console.log('🔵 authUrl type:', typeof authUrl);
                  console.log('🔵 authUrl truthy?:', !!authUrl);
                  
                  // TESTING: Just show the URL, don't try to open it
                  if (authUrl) {
                    console.log('✅ Got Salesforce URL!');
                    console.log('URL:', authUrl);
                    
                    // Copy to clipboard
                    navigator.clipboard.writeText(authUrl).then(() => {
                      alert('✅ Salesforce URL copied to clipboard!\n\nPaste it in a new tab to connect.\n\nURL: ' + authUrl.substring(0, 100) + '...');
                    }).catch(() => {
                      // Clipboard failed, just show in alert
                      alert('✅ Open this URL in a new tab:\n\n' + authUrl);
                    });
                    
                    return;
                  } else {
                    console.error('❌ No authUrl found!');
                    alert('❌ No authorization URL received');
                  }
                } catch (err) {
                  console.error('❌ Exception:', err);
                  alert('❌ Error: ' + String(err));
                }
              }}
              disabled={enabledIntegrations.includes('salesforce_user')}
              style={{
                width: "100%",
                padding: "10px",
                background: enabledIntegrations.includes('salesforce_user') ? "#f1f5f9" : "#00A1E0",
                color: enabledIntegrations.includes('salesforce_user') ? "#94a3b8" : "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: enabledIntegrations.includes('salesforce_user') ? "not-allowed" : "pointer"
              }}
            >
              {enabledIntegrations.includes('salesforce_user') ? "✓ Connected" : "Connect Salesforce"}
            </button>
          </div>

        {/* HubSpot CRM Integration */}
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: 12,
            marginBottom: 12,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #ff7a59 0%, #ff5c35 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20
                }}>
                  🟠
                </div>
                <div>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 2px 0"
                  }}>
                    HubSpot CRM
                  </h3>
                  <p style={{
                    fontSize: 11,
                    color: "#64748b",
                    margin: 0
                  }}>
                    Auto-check contacts & tailor emails
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: 11,
                padding: "4px 10px",
                background: enabledIntegrations.includes('hubspot_user') ? "#d1fae5" : "#fef3c7",
                color: enabledIntegrations.includes('hubspot_user') ? "#065f46" : "#92400e",
                borderRadius: 6,
                fontWeight: 600
              }}>
                {enabledIntegrations.includes('hubspot_user') ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 12,
              lineHeight: 1.5
            }}>
              {enabledIntegrations.includes('hubspot_user') 
                ? "Your HubSpot is connected. Emails are automatically tailored based on CRM data."
                : "Connect your HubSpot to check if prospects exist and auto-add new contacts."}
            </p>
            <button
              onClick={async () => {
                const { authToken } = await chrome.storage.local.get(['authToken']);
                if (!authToken) {
                  alert('Please log in first');
                  return;
                }
                
                const res = await chrome.runtime.sendMessage({
                  type: "PING_API",
                  url: `${apiBase}/api/hubspot/auth-user`,
                  method: "GET",
                  authToken,
                });
                
                if (res.ok && res.data?.authUrl) {
                  chrome.tabs.create({ url: res.data.authUrl });
                } else {
                  alert('Failed to connect. Make sure API keys are configured.');
                }
              }}
              disabled={enabledIntegrations.includes('hubspot_user')}
              style={{
                width: "100%",
                padding: "10px",
                background: enabledIntegrations.includes('hubspot_user') ? "#f1f5f9" : "#ff7a59",
                color: enabledIntegrations.includes('hubspot_user') ? "#94a3b8" : "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: enabledIntegrations.includes('hubspot_user') ? "not-allowed" : "pointer"
              }}
            >
              {enabledIntegrations.includes('hubspot_user') ? "✓ Connected" : "Connect HubSpot"}
            </button>
          </div>

        {/* Gmail Integration */}
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: 12,
            marginBottom: 12,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #ea4335 0%, #c5221f 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20
                }}>
                  📧
                </div>
                <div>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 2px 0"
                  }}>
                    Gmail
                  </h3>
                  <p style={{
                    fontSize: 11,
                    color: "#64748b",
                    margin: 0
                  }}>
                    Send emails directly from extension
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: 11,
                padding: "4px 10px",
                background: enabledIntegrations.includes('gmail_user') ? "#d1fae5" : "#fef3c7",
                color: enabledIntegrations.includes('gmail_user') ? "#065f46" : "#92400e",
                borderRadius: 6,
                fontWeight: 600
              }}>
                {enabledIntegrations.includes('gmail_user') ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 12,
              lineHeight: 1.5
            }}>
              {enabledIntegrations.includes('gmail_user') 
                ? "Your Gmail is connected. You can send and draft emails directly."
                : "Connect your Gmail to send drafted emails directly from the extension."}
            </p>
            <button
              onClick={async () => {
                const { authToken } = await chrome.storage.local.get(['authToken']);
                if (!authToken) {
                  alert('Please log in first');
                  return;
                }
                
                const res = await chrome.runtime.sendMessage({
                  type: "PING_API",
                  url: `${apiBase}/api/gmail/auth-user`,
                  method: "GET",
                  authToken,
                });
                
                if (res.ok && res.data?.authUrl) {
                  chrome.tabs.create({ url: res.data.authUrl });
                } else {
                  alert('Failed to connect. Make sure API keys are configured.');
                }
              }}
              disabled={enabledIntegrations.includes('gmail_user')}
              style={{
                width: "100%",
                padding: "10px",
                background: enabledIntegrations.includes('gmail_user') ? "#f1f5f9" : "#ea4335",
                color: enabledIntegrations.includes('gmail_user') ? "#94a3b8" : "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: enabledIntegrations.includes('gmail_user') ? "not-allowed" : "pointer"
              }}
            >
              {enabledIntegrations.includes('gmail_user') ? "✓ Connected" : "Connect Gmail"}
            </button>
          </div>

        {/* Outlook Integration */}
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: 12,
            marginBottom: 12,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #0078d4 0%, #005a9e 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20
                }}>
                  📨
                </div>
                <div>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 2px 0"
                  }}>
                    Outlook
                  </h3>
                  <p style={{
                    fontSize: 11,
                    color: "#64748b",
                    margin: 0
                  }}>
                    Send emails via Microsoft 365
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: 11,
                padding: "4px 10px",
                background: enabledIntegrations.includes('outlook_user') ? "#d1fae5" : "#fef3c7",
                color: enabledIntegrations.includes('outlook_user') ? "#065f46" : "#92400e",
                borderRadius: 6,
                fontWeight: 600
              }}>
                {enabledIntegrations.includes('outlook_user') ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 12,
              lineHeight: 1.5
            }}>
              {enabledIntegrations.includes('outlook_user') 
                ? "Your Outlook is connected. You can send and draft emails directly."
                : "Connect your Outlook to send drafted emails directly from the extension."}
            </p>
            <button
              onClick={async () => {
                const { authToken } = await chrome.storage.local.get(['authToken']);
                if (!authToken) {
                  alert('Please log in first');
                  return;
                }
                
                const res = await chrome.runtime.sendMessage({
                  type: "PING_API",
                  url: `${apiBase}/api/outlook/auth-user`,
                  method: "GET",
                  authToken,
                });
                
                if (res.ok && res.data?.authUrl) {
                  chrome.tabs.create({ url: res.data.authUrl });
                } else {
                  alert('Failed to connect. Make sure API keys are configured.');
                }
              }}
              disabled={enabledIntegrations.includes('outlook_user')}
              style={{
                width: "100%",
                padding: "10px",
                background: enabledIntegrations.includes('outlook_user') ? "#f1f5f9" : "#0078d4",
                color: enabledIntegrations.includes('outlook_user') ? "#94a3b8" : "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: enabledIntegrations.includes('outlook_user') ? "not-allowed" : "pointer"
              }}
            >
              {enabledIntegrations.includes('outlook_user') ? "✓ Connected" : "Connect Outlook"}
            </button>
          </div>

        {/* Monday.com Integration */}
        <div style={{
            background: "white",
            padding: "20px",
            borderRadius: 12,
            marginBottom: 12,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            border: "1px solid #e5e7eb"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #ff3d57 0%, #e02f44 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20
                }}>
                  📊
                </div>
                <div>
                  <h3 style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 2px 0"
                  }}>
                    Monday.com
                  </h3>
                  <p style={{
                    fontSize: 11,
                    color: "#64748b",
                    margin: 0
                  }}>
                    Sync contacts to your boards
                  </p>
                </div>
              </div>
              <span style={{
                fontSize: 11,
                padding: "4px 10px",
                background: enabledIntegrations.includes('monday_user') ? "#d1fae5" : "#fef3c7",
                color: enabledIntegrations.includes('monday_user') ? "#065f46" : "#92400e",
                borderRadius: 6,
                fontWeight: 600
              }}>
                {enabledIntegrations.includes('monday_user') ? "Connected" : "Not Connected"}
              </span>
            </div>
            <p style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 12,
              lineHeight: 1.5
            }}>
              {enabledIntegrations.includes('monday_user') 
                ? "Your Monday.com is connected. Contacts are automatically synced to your boards."
                : "Connect Monday.com to sync analyzed profiles and activities to your boards."}
            </p>
            <button
              onClick={async () => {
                const { authToken } = await chrome.storage.local.get(['authToken']);
                if (!authToken) {
                  alert('Please log in first');
                  return;
                }
                
                const res = await chrome.runtime.sendMessage({
                  type: "PING_API",
                  url: `${apiBase}/api/monday/auth-user`,
                  method: "GET",
                  authToken,
                });
                
                if (res.ok && res.data?.authUrl) {
                  chrome.tabs.create({ url: res.data.authUrl });
                } else {
                  alert('Failed to connect. Make sure API keys are configured.');
                }
              }}
              disabled={enabledIntegrations.includes('monday_user')}
              style={{
                width: "100%",
                padding: "10px",
                background: enabledIntegrations.includes('monday_user') ? "#f1f5f9" : "#ff3d57",
                color: enabledIntegrations.includes('monday_user') ? "#94a3b8" : "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: enabledIntegrations.includes('monday_user') ? "not-allowed" : "pointer"
              }}
            >
              {enabledIntegrations.includes('monday_user') ? "✓ Connected" : "Connect Monday.com"}
            </button>
          </div>
      </div>
    );
  };

  // Navigation Component
  const renderNavigation = () => (
    <div style={{
      background: "white",
      borderBottom: "2px solid #e5e7eb",
      display: "flex",
      justifyContent: "space-around",
      padding: "0",
      position: "relative",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
    }}>
      {[
        { id: "home" as Page, icon: "🏠", label: "Home" },
        { id: "context" as Page, icon: "👤", label: "Context" },
        { id: "integrations" as Page, icon: "🔌", label: "Integrations" },
      ].map((page) => (
        <button
          key={page.id}
          onClick={() => {
            setCurrentPage(page.id);
            setActionType(null);
            setResponse("");
          }}
          style={{
            flex: 1,
            padding: "14px 8px",
            background: currentPage === page.id ? "#f0f9ff" : "transparent",
            border: "none",
            borderBottom: currentPage === page.id ? "3px solid #0ea5e9" : "3px solid transparent",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            color: currentPage === page.id ? "#0ea5e9" : "#64748b",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            position: "relative"
          }}
          onMouseOver={(e) => {
            if (currentPage !== page.id) {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseOut={(e) => {
            if (currentPage !== page.id) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#64748b";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          <span style={{ 
            fontSize: 20,
            transition: "transform 0.2s ease",
            display: "inline-block"
          }}>{page.icon}</span>
          <span style={{ letterSpacing: "0.3px" }}>{page.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'SF Pro Display', system-ui, sans-serif",
      width: 420,
      minHeight: 500,
      maxHeight: 600,
      background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
      padding: 0,
      margin: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        background: "white",
        padding: "20px 24px",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)"
            }}>
              <Logo size={40} />
            </div>
            <div>
              <h1 style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                color: "#0f172a",
                letterSpacing: "-0.3px"
              }}>
                Sales Curiosity
              </h1>
              {organization ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  {organization.account_type === 'individual' ? (
                    <span style={{
                      fontSize: 9,
                      color: "#0ea5e9",
                      fontWeight: 600,
                      background: "#f0f9ff",
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "1px solid #bae6fd"
                    }}>
                      👤 Personal
                    </span>
                  ) : (
                    <>
                      <span style={{
                        fontSize: 9,
                        color: "#8b5cf6",
                        fontWeight: 600,
                        background: "#f5f3ff",
                        padding: "2px 6px",
                        borderRadius: 4,
                        border: "1px solid #ddd6fe"
                      }}>
                        🏢 {organization.name}
                      </span>
                      {userRole === 'org_admin' && (
                        <span style={{
                          fontSize: 9,
                          color: "#dc2626",
                          fontWeight: 700,
                          background: "#fef2f2",
                          padding: "2px 6px",
                          borderRadius: 4,
                          border: "1px solid #fecaca"
                        }}>
                          ADMIN
                        </span>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p style={{
                  fontSize: 10,
                  color: "#64748b",
                  margin: 0,
                  fontWeight: 500
                }}>
                  {user?.email || "Logged in"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              background: "#f1f5f9",
              border: "none",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "#475569",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#e2e8f0";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      {renderNavigation()}

      {/* Content Area - Render based on current page */}
      <div style={{ 
        padding: "24px", 
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden"
      }}>
        {currentPage === "home" && renderHomePage()}
        {currentPage === "context" && renderContextPage()}
        {currentPage === "integrations" && renderIntegrationsPage()}
      </div>

      {/* Enhanced animations and global styles */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        * {
          box-sizing: border-box;
        }
        button {
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        input, textarea {
          font-family: inherit;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);


