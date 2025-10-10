#!/bin/bash
# Sales Curiosity Engine - Migration Commands
# Run these commands step by step

echo "🚀 Sales Curiosity Engine Migration"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# STEP 1: GitHub Migration
# ============================================
echo -e "${BLUE}STEP 1: Migrate to New GitHub Repo${NC}"
echo ""
echo "First, create a new repo on GitHub at: https://github.com/new"
echo "Then come back and continue..."
read -p "Press Enter when you've created the new GitHub repo..."
echo ""

read -p "Enter your new GitHub username: " GITHUB_USERNAME
read -p "Enter your new repository name: " REPO_NAME
echo ""

echo "Removing old remote..."
git remote remove origin 2>/dev/null || echo "No origin to remove"

echo "Adding new remote..."
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo "Verifying remote..."
git remote -v

echo ""
read -p "Push to new repo now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git push -u origin main
    echo -e "${GREEN}✅ Pushed to new GitHub repo!${NC}"
else
    echo "Skipping push. Run 'git push -u origin main' when ready."
fi

echo ""
echo -e "${GREEN}✅ Step 1 Complete!${NC}"
echo ""

# ============================================
# STEP 2: Generate NextAuth Secret
# ============================================
echo -e "${BLUE}STEP 2: Generate NextAuth Secret${NC}"
echo ""
echo "Generating secure NextAuth secret..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo ""
echo "Your NEXTAUTH_SECRET:"
echo -e "${YELLOW}$NEXTAUTH_SECRET${NC}"
echo ""
echo "⚠️  SAVE THIS! You'll need it for Vercel environment variables."
echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================
# STEP 3: Supabase Setup Reminder
# ============================================
echo -e "${BLUE}STEP 3: Set Up New Supabase Project${NC}"
echo ""
echo "1. Go to: https://supabase.com"
echo "2. Sign in to your NEW account"
echo "3. Create new project (name: sales-curiosity)"
echo "4. Once ready, go to SQL Editor"
echo "5. Copy contents of: supabase-schema-organizations.sql"
echo "6. Paste and Run in Supabase SQL Editor"
echo "7. Go to Settings → API and save:"
echo "   - Project URL"
echo "   - anon public key"
echo "   - service_role key"
echo ""
read -p "Press Enter when Supabase setup is complete..."
echo ""

# ============================================
# STEP 4: Environment Variables Template
# ============================================
echo -e "${BLUE}STEP 4: Environment Variables for Vercel${NC}"
echo ""
echo "Copy these to Vercel when deploying:"
echo "===================================="
echo ""

cat << 'EOF'
# Supabase (get from Supabase Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# App URLs (update with your Vercel URL after first deploy)
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NEXTAUTH_URL=https://your-project.vercel.app

# NextAuth Secret (generated above)
NEXTAUTH_SECRET=<USE_THE_SECRET_FROM_STEP_2>

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Salesforce (use YOUR credentials from Salesforce setup)
SALESFORCE_CLIENT_ID=your_salesforce_consumer_key_here
SALESFORCE_CLIENT_SECRET=your_salesforce_consumer_secret_here
SALESFORCE_REDIRECT_URI=https://your-project.vercel.app/api/salesforce/callback

# Optional
USE_MOCK_AI=0
EOF

echo ""
echo "===================================="
echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================
# STEP 5: Vercel Deployment Instructions
# ============================================
echo -e "${BLUE}STEP 5: Deploy to Vercel${NC}"
echo ""
echo "1. Go to: https://vercel.com"
echo "2. Sign in to your NEW account"
echo "3. Click 'Add New...' → 'Project'"
echo "4. Import from GitHub (select your new repo)"
echo "5. ⚠️  IMPORTANT: Set Root Directory to: apps/sales-curiosity-web"
echo "6. Add ALL environment variables from Step 4"
echo "7. Click 'Deploy'"
echo "8. After deploy, copy your Vercel URL"
echo "9. Update env vars with real URL and redeploy"
echo ""
read -p "Enter your Vercel URL (e.g., my-app.vercel.app): " VERCEL_URL
echo ""
echo "Your Vercel URL: https://$VERCEL_URL"
echo ""

# ============================================
# STEP 6: Update Salesforce
# ============================================
echo -e "${BLUE}STEP 6: Update Salesforce Callback URLs${NC}"
echo ""
echo "Go to: Salesforce Setup → External Client Apps → Sales Curiosity Engine"
echo ""
echo "Update Callback URLs to:"
echo -e "${YELLOW}https://$VERCEL_URL/api/salesforce/callback${NC}"
echo -e "${YELLOW}https://$VERCEL_URL/api/salesforce/user-callback${NC}"
echo ""
read -p "Press Enter when Salesforce is updated..."
echo ""

# ============================================
# STEP 7: Update Extension
# ============================================
echo -e "${BLUE}STEP 7: Update Chrome Extension${NC}"
echo ""
echo "Updating popup.tsx with new API URL..."
echo ""

# Find and replace the API URL in popup.tsx
POPUP_FILE="apps/sales-curiosity-extension/src/popup.tsx"
if [ -f "$POPUP_FILE" ]; then
    # Backup
    cp "$POPUP_FILE" "${POPUP_FILE}.backup"
    
    # Replace the old URL with new one
    sed -i '' "s|https://curiosityengine-sales-curiosity-web.vercel.app|https://$VERCEL_URL|g" "$POPUP_FILE"
    
    echo "✅ Updated popup.tsx"
    echo ""
    echo "Building extension..."
    cd apps/sales-curiosity-extension
    npm run build
    cd ../..
    echo ""
    echo -e "${GREEN}✅ Extension built!${NC}"
    echo ""
    echo "To reload extension:"
    echo "1. Go to chrome://extensions/"
    echo "2. Find Sales Curiosity"
    echo "3. Click reload icon"
else
    echo "⚠️  Could not find popup.tsx"
    echo "Manually update: $POPUP_FILE"
    echo "Change API URL to: https://$VERCEL_URL"
fi

echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================
# STEP 8: Commit Changes
# ============================================
echo -e "${BLUE}STEP 8: Commit and Push Changes${NC}"
echo ""
read -p "Commit and push changes to GitHub? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git add .
    git commit -m "Update configuration for new deployment

- Updated API URLs to $VERCEL_URL
- Configured for new Supabase instance
- Ready for production"
    git push origin main
    echo -e "${GREEN}✅ Changes pushed!${NC}"
else
    echo "Skipping git push. Remember to commit and push manually!"
fi

echo ""
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 MIGRATION COMPLETE! 🎉${NC}"
echo "=========================================="
echo ""
echo "Your Sales Curiosity Engine is now running on:"
echo "✅ New GitHub repo: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo "✅ New Vercel deployment: https://$VERCEL_URL"
echo "✅ New Supabase project"
echo "✅ Chrome extension updated"
echo ""
echo "Next steps:"
echo "1. Test login at: https://$VERCEL_URL"
echo "2. Test extension connection"
echo "3. Test Salesforce integration"
echo ""
echo "📚 For detailed testing, see: MIGRATION_GUIDE.md"
echo ""
