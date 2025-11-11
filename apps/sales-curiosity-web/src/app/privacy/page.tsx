export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg">
          <p className="text-gray-600 mb-6">
            <strong>Last Updated:</strong> November 9, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Curiosity Engine ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application and Chrome extension.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Email address and name (via Google or Microsoft OAuth)</li>
              <li>Profile information and preferences you set in the application</li>
              <li>LinkedIn profile data you choose to analyze</li>
              <li>Email drafts and content you create using our AI tools</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Usage data and analytics</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Log data and error reports</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Authenticate your identity via OAuth</li>
              <li>Send emails on your behalf (only when you explicitly request it)</li>
              <li>Generate AI-powered LinkedIn analysis and email drafts</li>
              <li>Improve and optimize our services</li>
              <li>Respond to your requests and provide customer support</li>
              <li>Send you technical notices and updates</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. OAuth and Third-Party Integrations</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Google Workspace (Gmail & Calendar)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              When you connect Google Workspace, we request permission to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li><strong>Gmail - Send emails:</strong> We send emails only when you explicitly click "Send" in our application</li>
              <li><strong>Gmail - Create drafts:</strong> We create email drafts when you use the AI draft feature</li>
              <li><strong>Gmail - Search emails:</strong> We search your emails only when you explicitly request it (e.g., "find emails from John")</li>
              <li><strong>Gmail - Access settings:</strong> We retrieve your default email signature to append to drafted emails</li>
              <li><strong>Calendar - Read events:</strong> We read your calendar events to provide meeting context and scheduling assistance</li>
              <li><strong>Calendar - Create events:</strong> We create calendar events only when you explicitly request it</li>
              <li><strong>Profile access:</strong> We access your basic profile information (name, email) for authentication</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              We <strong>do not</strong> read the content of your emails, monitor your inbox, or access your data without explicit user action.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Microsoft 365 (Outlook & Calendar)</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              When you connect Microsoft 365, we request permission to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li><strong>Mail.Send:</strong> Send emails on your behalf when you click "Send"</li>
              <li><strong>Mail.ReadWrite:</strong> Create email drafts and search emails when requested</li>
              <li><strong>Calendars.Read & Calendars.ReadWrite:</strong> View and create calendar events</li>
              <li><strong>User.Read:</strong> Access your basic profile for authentication</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.3 Salesforce CRM</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              When you connect Salesforce, we access:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li><strong>Contacts & Leads:</strong> Search and create records to enhance email personalization</li>
              <li><strong>Notes & Tasks:</strong> Log activities and set follow-up reminders when requested</li>
              <li><strong>API Access:</strong> Read and write access to your Salesforce data as needed for CRM operations</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              All Salesforce access is on-demand based on your explicit requests. We do not continuously sync or monitor your CRM data.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.4 Revoking Access</h3>
            <p className="text-gray-700 leading-relaxed">
              You can revoke any integration's access at any time through:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Curiosity Engine dashboard → Connectors → Disconnect button</li>
              <li>Your Google Account → Security → Third-party apps</li>
              <li>Your Microsoft Account → Permissions</li>
              <li>Your Salesforce → Setup → Connected Apps</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Storage and Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We store your data securely using Supabase and implement industry-standard security measures including encryption at rest and in transit. OAuth tokens are stored securely and are never exposed to the client-side application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Third-Party Services</h2>
            <p className="text-gray-700 mb-3">We use the following third-party services to provide and enhance our platform:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Google OAuth, Gmail & Calendar APIs:</strong> For authentication, email drafting/sending, and calendar integration. We only access your Gmail and Calendar data when you explicitly authorize these integrations and request specific actions.</li>
              <li><strong>Microsoft OAuth & Graph API:</strong> For authentication, Outlook email drafting/sending, and calendar integration. We only access your Outlook and Calendar data when you explicitly authorize these integrations.</li>
              <li><strong>Salesforce API:</strong> For CRM data synchronization when you connect your Salesforce account. We access only the data necessary to search contacts, create leads, and enhance email drafting.</li>
              <li><strong>SambaNova Cloud:</strong> For AI-powered content generation and intelligent response generation. Your prompts and conversations are processed through SambaNova's LLM API to provide AI assistance.</li>
              <li><strong>Tavily Search API:</strong> For web search capabilities when you request current information or research. Search queries are sent to Tavily to retrieve relevant web results.</li>
              <li><strong>Supabase:</strong> For secure database storage, user authentication, and data management.</li>
              <li><strong>Vercel:</strong> For application hosting, deployment, and serverless function execution.</li>
            </ul>
            <p className="text-gray-700 mt-4 leading-relaxed">
              Each third-party service has its own privacy policy and data handling practices. We carefully select partners that meet high security and privacy standards.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
            <p className="text-gray-700 mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Revoke OAuth permissions at any time via your Google or Microsoft account settings</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and data at any time by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our services are not intended for users under the age of 18. We do not knowingly collect personal information from children under 18.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-700 mt-3">
              <strong>Email:</strong> hello@curiosityengine.io<br />
              <strong>Website:</strong> www.curiosityengine.io
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. GDPR Compliance (EU Users)</h2>
            <p className="text-gray-700 leading-relaxed">
              If you are located in the European Economic Area (EEA), you have certain rights under the General Data Protection Regulation (GDPR). We process your data lawfully based on your consent and our legitimate business interests.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. California Privacy Rights (CCPA)</h2>
            <p className="text-gray-700 leading-relaxed">
              California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to delete personal information, and the right to opt-out of the sale of personal information. We do not sell your personal information.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <a 
            href="/"
            className="text-blue-600 hover:text-blue-800 font-semibold"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
