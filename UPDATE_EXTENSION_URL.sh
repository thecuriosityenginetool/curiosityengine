#!/bin/bash
# Update Chrome Extension API URL
# Run this after deploying to new Vercel account

echo "🔧 Update Chrome Extension API URL"
echo "===================================="
echo ""

# Get the new Vercel URL
read -p "Enter your NEW Vercel URL (e.g., my-app.vercel.app): " VERCEL_URL
echo ""

POPUP_FILE="apps/sales-curiosity-extension/src/popup.tsx"

if [ ! -f "$POPUP_FILE" ]; then
    echo "❌ Error: Could not find $POPUP_FILE"
    exit 1
fi

echo "Updating API URL in popup.tsx..."

# Backup
cp "$POPUP_FILE" "${POPUP_FILE}.backup"

# Replace the URL
sed -i '' "s|https://curiosityengine-sales-curiosity-web.vercel.app|https://$VERCEL_URL|g" "$POPUP_FILE"

echo "✅ Updated popup.tsx"
echo ""
echo "Building extension..."
cd apps/sales-curiosity-extension
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Extension built successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Go to chrome://extensions/"
    echo "2. Find 'Sales Curiosity' extension"
    echo "3. Click the reload/refresh icon"
    echo "4. Test the extension!"
    echo ""
    echo "Your extension will now connect to: https://$VERCEL_URL"
else
    echo "❌ Build failed. Check the error above."
    exit 1
fi

