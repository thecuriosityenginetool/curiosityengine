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

  async function handleLogout() {
    try {
      await chrome.storage.local.clear();
      setIsAuthenticated(false);
      setUser(null);
      setResponse("");
      setProfileData(null);
      setUserContext({ aboutMe: "", objectives: "" });
      setTempContext({ aboutMe: "", objectives: "" });
      setOrganization(null);
      setUserStats(null);
    } catch (e) {
      console.error("Error logging out:", e);
    }
  }

  async function analyzeProfile(action: ActionType, emailCtx?: string) {
    try {
      setLoading(true);
      setResponse("");
      setActionType(action);
      if (emailCtx) setEmailContext(emailCtx);

      // Get auth token
      const { authToken } = await chrome.storage.local.get(['authToken']);

      // Extract LinkedIn profile data via content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;
      if (!tabId) throw new Error("No active tab found");

      const extractResponse = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_PROFILE" });
      if (!extractResponse?.success) {
        throw new Error(extractResponse?.error || "Failed to extract profile data");
      }

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
          emailContext: action === "email" ? emailCtx : undefined,
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
    
    const blob = new Blob([response], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAsPDF() {
    if (!response) return;
    
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(response, 180);
    doc.text(lines, 15, 15);
    doc.save(`analysis-${Date.now()}.pdf`);
  }

  function copyToClipboard() {
    if (!response) return;
    navigator.clipboard.writeText(response);
  }

  // If not authenticated, show OAuth login
  if (!isAuthenticated) {
    return (
      <div style={{
        width: 380,
        minHeight: 500,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "white",
        overflow: "hidden"
      }}>
        <div style={{
          padding: "32px 24px",
          textAlign: "center"
        }}>
          {/* Logo */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24
          }}>
            <Logo size={64} />
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            letterSpacing: "-0.5px"
          }}>
            Sales Curiosity
          </h1>
          <p style={{
            fontSize: 14,
            opacity: 0.9,
            marginBottom: 32,
            fontWeight: 400
          }}>
            AI-Powered LinkedIn Intelligence
          </p>

          {/* OAuth Buttons */}
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)"
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
        </div>
      </div>
    );
  }

  // Main authenticated UI
  return (
    <div style={{
      width: 380,
      minHeight: 500,
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "white"
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 16px",
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.2)"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LogoSmall size={32} />
            <div>
              <h1 style={{
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.3px"
              }}>
                Sales Curiosity
              </h1>
              {user && (
                <p style={{
                  fontSize: 11,
                  opacity: 0.85,
                  margin: "2px 0 0 0"
                }}>
                  {user.email || user.full_name || "User"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 6,
              color: "white",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Navigation */}
        <div style={{
          display: "flex",
          gap: 8
        }}>
          <button
            onClick={() => setCurrentPage("home")}
            style={{
              flex: 1,
              padding: "8px",
              background: currentPage === "home" 
                ? "rgba(255, 255, 255, 0.25)" 
                : "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 8,
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            🏠 Home
          </button>
          <button
            onClick={() => setCurrentPage("context")}
            style={{
              flex: 1,
              padding: "8px",
              background: currentPage === "context" 
                ? "rgba(255, 255, 255, 0.25)" 
                : "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 8,
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            📝 Context
          </button>
          <button
            onClick={() => setCurrentPage("integrations")}
            style={{
              flex: 1,
              padding: "8px",
              background: currentPage === "integrations" 
                ? "rgba(255, 255, 255, 0.25)" 
                : "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 8,
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            🔗 Integrations
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding: 20,
        maxHeight: 480,
        overflowY: "auto"
      }}>
        {currentPage === "home" && (
          <>
            {/* Stats */}
            {userStats && (
              <div style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  textAlign: "center"
                }}>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                      {userStats.totalAnalyses || 0}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Analyses</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                      {userStats.emailsDrafted || 0}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Emails</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                      {userStats.profilesAnalyzed || 0}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.85 }}>Profiles</div>
                  </div>
                </div>
              </div>
            )}

            {/* LinkedIn Check */}
            {!isLinkedIn && (
              <div style={{
                background: "rgba(251, 191, 36, 0.2)",
                border: "1px solid rgba(251, 191, 36, 0.5)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                fontSize: 13,
                lineHeight: 1.5
              }}>
                ⚠️ Please navigate to a LinkedIn profile page to use this extension.
              </div>
            )}

            {/* Action Buttons */}
            {isLinkedIn && (
              <>
                <button
                  onClick={() => analyzeProfile("analyze")}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: 16,
                    background: loading 
                      ? "rgba(148, 163, 184, 0.5)" 
                      : "linear-gradient(135deg, #F95B14 0%, #e04d0a 100%)",
                    border: "none",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    marginBottom: 12,
                    boxShadow: "0 4px 12px rgba(249, 91, 20, 0.4)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(249, 91, 20, 0.5)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(249, 91, 20, 0.4)";
                    }
                  }}
                >
                  {loading && actionType === "analyze" ? "Analyzing..." : "🔍 Analyze Profile"}
                </button>

                <button
                  onClick={() => {
                    const context = prompt("Optional: Add context for the email (e.g., 'Follow up on our meeting')");
                    analyzeProfile("email", context || "");
                  }}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: 16,
                    background: loading 
                      ? "rgba(148, 163, 184, 0.5)" 
                      : "rgba(255, 255, 255, 0.2)",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {loading && actionType === "email" ? "Drafting..." : "✉️ Draft Email"}
                </button>
              </>
            )}

            {/* Response */}
            {response && (
              <div style={{
                marginTop: 16,
                background: "white",
                color: "#1f2937",
                borderRadius: 12,
                padding: 16,
                fontSize: 13,
                lineHeight: 1.6,
                maxHeight: 300,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
              }}>
                {response.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={i} style={{ fontWeight: 700, marginTop: i > 0 ? 8 : 0 }}>{line.replace(/\*\*/g, '')}</div>;
                  }
                  if (line.startsWith('🔗') || line.startsWith('➕')) {
                    return <div key={i} style={{ background: '#fef3c7', padding: 8, borderRadius: 6, marginBottom: 8, color: '#92400e' }}>{line}</div>;
                  }
                  return <div key={i}>{line}</div>;
                })}
              </div>
            )}

            {/* Export Buttons */}
            {response && (
              <div style={{
                marginTop: 12,
                display: "flex",
                gap: 8
              }}>
                <button
                  onClick={copyToClipboard}
                  style={{
                    flex: 1,
                    padding: 10,
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  📋 Copy
                </button>
                <button
                  onClick={exportAsText}
                  style={{
                    flex: 1,
                    padding: 10,
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  📄 Text
                </button>
                <button
                  onClick={exportAsPDF}
                  style={{
                    flex: 1,
                    padding: 10,
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  📑 PDF
                </button>
              </div>
            )}
          </>
        )}

        {currentPage === "context" && (
          <div style={{
            background: "white",
            color: "#1f2937",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 16,
              color: "#1f2937"
            }}>
              Your Context
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "#374151"
              }}>
                About Me
              </label>
              <textarea
                value={tempContext.aboutMe}
                onChange={(e) => setTempContext({ ...tempContext, aboutMe: e.target.value })}
                placeholder="Tell us about yourself, your role, and your company..."
                style={{
                  width: "100%",
                  minHeight: 100,
                  padding: 12,
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "#374151"
              }}>
                Sales Objectives
              </label>
              <textarea
                value={tempContext.objectives}
                onChange={(e) => setTempContext({ ...tempContext, objectives: e.target.value })}
                placeholder="What are your sales goals and target prospects?"
                style={{
                  width: "100%",
                  minHeight: 100,
                  padding: 12,
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <button
              onClick={async () => {
                setSaving(true);
                await saveUserContext(tempContext);
                setSaveMessage("✓ Context saved!");
                setTimeout(() => setSaveMessage(""), 3000);
                setSaving(false);
              }}
              disabled={saving}
              style={{
                width: "100%",
                padding: 12,
                background: "linear-gradient(135deg, #F95B14 0%, #e04d0a 100%)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? "Saving..." : saveMessage || "Save Context"}
            </button>
          </div>
        )}

        {currentPage === "integrations" && (
          <div style={{
            background: "white",
            color: "#1f2937",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
          }}>
            <h3 style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 16,
              color: "#1f2937"
            }}>
              Integrations
            </h3>

            {/* Salesforce Integration */}
            <div style={{
              padding: 16,
              border: "2px solid #e5e7eb",
              borderRadius: 10,
              marginBottom: 12
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10
                }}>
                  <div style={{ fontSize: 24 }}>☁️</div>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Salesforce</span>
                </div>
                <span style={{
                  padding: "4px 10px",
                  background: enabledIntegrations.includes('salesforce_user') ? "#d1fae5" : "#f3f4f6",
                  color: enabledIntegrations.includes('salesforce_user') ? "#059669" : "#6b7280",
                  borderRadius: 6,
                  fontSize: 11,
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
                    const { authToken } = await chrome.storage.local.get(['authToken']);
                    
                    if (!authToken) {
                      alert('❌ Please log in to the extension first');
                      return;
                    }
                    
                    const url = `${apiBase}/api/salesforce/auth-user`;
                    
                    const res = await chrome.runtime.sendMessage({
                      type: "PING_API",
                      url: url,
                      method: "GET",
                      authToken,
                    });
                    
                    const authUrl = res.data?.authUrl;
                    
                    if (res.ok && authUrl) {
                      chrome.tabs.create({ url: authUrl });
                    } else {
                      alert('Failed to get Salesforce OAuth URL. Check console for details.');
                      console.error('Salesforce auth response:', res);
                    }
                  } catch (err) {
                    alert('Error: ' + String(err));
                    console.error('Salesforce connection error:', err);
                  }
                }}
                disabled={enabledIntegrations.includes('salesforce_user')}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background: enabledIntegrations.includes('salesforce_user') 
                    ? "#e5e7eb" 
                    : "linear-gradient(135deg, #00A1E0 0%, #0089c2 100%)",
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: enabledIntegrations.includes('salesforce_user') ? "not-allowed" : "pointer",
                  opacity: enabledIntegrations.includes('salesforce_user') ? 0.6 : 1
                }}
              >
                {enabledIntegrations.includes('salesforce_user') ? "✓ Connected" : "Connect Salesforce"}
              </button>
            </div>

            {/* Info Note */}
            <div style={{
              padding: 12,
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              borderRadius: 8,
              fontSize: 12,
              color: "#1e40af",
              lineHeight: 1.5
            }}>
              <strong>💡 Tip:</strong> Connect Salesforce to automatically check if LinkedIn prospects are in your CRM and get smarter email drafts.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<Popup />);

