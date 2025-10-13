'use client';

export default function SalesforceConnectedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ☁️ Salesforce Connected!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your Salesforce CRM has been successfully connected.
        </p>
        
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800 font-semibold mb-2">
            ✅ Integration active!
          </p>
          <p className="text-xs text-green-700">
            Your emails will now be automatically tailored based on CRM data.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Next steps:</strong>
          </p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside text-left">
            <li>Close this tab</li>
            <li>Return to LinkedIn</li>
            <li>Click the extension icon</li>
            <li>Go to Integrations tab</li>
            <li>Salesforce should show "Connected"</li>
          </ol>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4">
          <p className="text-xs text-yellow-800">
            <strong>💡 Tip:</strong> The extension checks your Salesforce automatically when drafting emails. If a prospect exists in your CRM, the AI will write a follow-up email. If they're new, they'll be added to your Salesforce automatically!
          </p>
        </div>

        <button
          onClick={() => window.close()}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors mb-2"
        >
          Close This Tab
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          Keyboard shortcut: <kbd className="px-2 py-1 bg-gray-200 border border-gray-300 rounded">Cmd+W</kbd> or <kbd className="px-2 py-1 bg-gray-200 border border-gray-300 rounded">Ctrl+W</kbd>
        </p>
      </div>
    </div>
  );
}

