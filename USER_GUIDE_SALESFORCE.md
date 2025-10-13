# 🎯 How to Connect Your Salesforce to Sales Curiosity Engine

## What You'll Get

Once connected, Sales Curiosity Engine will:

✅ **Check if LinkedIn prospects already exist in your Salesforce CRM**
✅ **Generate smarter AI emails** - follow-up style for existing contacts, cold outreach for new ones
✅ **Automatically add new contacts to your Salesforce** when you draft first emails
✅ **Keep your CRM in sync** without manual data entry

---

## How to Connect (2 minutes)

### Option 1: From the Web App

1. Log in to **Sales Curiosity Engine** (https://www.curiosityengine.io)
2. Go to **Settings** → **Integrations**
3. Find the **Salesforce** card
4. Click **"Connect Salesforce"**
5. Log in with your Salesforce credentials
6. Click **"Allow"** to grant permissions
7. ✅ Done! You'll see "Connected" status

### Option 2: From the Chrome Extension

1. Click the **Sales Curiosity** extension icon
2. Click the **⚙️ Settings** tab
3. Scroll to **Integrations** section
4. Find the **Salesforce** card
5. Click **"Connect Salesforce"**
6. A new tab opens → Log in to your Salesforce
7. Click **"Allow"**
8. Close the tab
9. ✅ Done! Extension shows "Connected"

---

## How It Works

### Before (Without Salesforce):
```
You generate an email → AI writes generic cold email
```

### After (With Salesforce):
```
You generate an email
    ↓
AI checks your Salesforce CRM
    ↓
IF person exists: "Hi [Name], following up on our conversation..."
IF person is new: "Hi [Name], I came across your profile..." + auto-adds to CRM
    ↓
Perfect email + CRM stays updated!
```

---

## What Information Is Accessed?

When you connect Salesforce, we **only access**:

✅ Your Contacts (to check if prospects exist)
✅ Your Leads (to check if prospects exist)
✅ Ability to create new Contacts
✅ Ability to add notes/activities

We **DO NOT**:
❌ Delete any data
❌ Modify existing contacts (except to add notes)
❌ Access opportunities, cases, or other objects
❌ Share your data with anyone else

---

## Example: Tailored Email Generation

### Scenario 1: Person Already in Your CRM

**LinkedIn Profile:** John Smith, VP of Sales at Acme Corp

**AI checks Salesforce:** ✅ Found as Contact (last interaction: 2 months ago)

**Generated Email:**
> Hi John,
>
> I hope this message finds you well! I wanted to follow up on our conversation from a few months ago about improving your sales team's outreach efficiency.
>
> I noticed you're still at Acme Corp — congrats on the continued success there! I'd love to reconnect and share some updates on what we've been working on...

### Scenario 2: New Person (Not in CRM)

**LinkedIn Profile:** Sarah Johnson, Marketing Director at Tech Startup

**AI checks Salesforce:** ❌ Not found

**What happens:**
1. AI generates cold outreach email
2. Sarah is automatically added to your Salesforce as a Contact
3. LinkedIn URL and context are saved

**Generated Email:**
> Hi Sarah,
>
> I came across your profile and was impressed by your work at Tech Startup. As a Marketing Director, I imagine you're always looking for ways to improve your team's outreach and engagement strategies.
>
> I'd love to share how Sales Curiosity Engine has helped similar companies...

---

## Security & Privacy

🔒 **Your Salesforce credentials are secure:**
- OAuth tokens are encrypted in our database
- We never see or store your Salesforce password
- You can disconnect anytime
- Each user connects their own Salesforce (not shared)

🔐 **Row Level Security:**
- Only you can access your Salesforce tokens
- Tokens automatically refresh without exposing secrets
- All API calls use industry-standard security

---

## FAQ

### Q: Which Salesforce editions are supported?
**A:** All editions - Professional, Enterprise, Unlimited, and Developer Edition.

### Q: Can I connect multiple Salesforce accounts?
**A:** Currently, you can connect one Salesforce account per user. If you need to switch accounts, disconnect and reconnect.

### Q: What if the person's email in LinkedIn doesn't match Salesforce?
**A:** We search by both email and name. If not found, we'll create them as a new contact.

### Q: Will this create duplicate contacts?
**A:** No. We always search first before creating. If a contact exists (by email or name), we won't create a duplicate.

### Q: Can I disconnect my Salesforce?
**A:** Yes! Go to Settings → Integrations → Click "Disconnect" on the Salesforce card.

### Q: Does this work with Salesforce Sandbox?
**A:** Currently configured for production Salesforce. Contact support if you need sandbox support.

### Q: What happens if my Salesforce token expires?
**A:** Tokens automatically refresh in the background. You shouldn't notice any interruption.

### Q: Can I customize which fields are populated?
**A:** The integration populates standard fields (Name, Email, Title, Company, LinkedIn URL). Custom field mapping can be configured by your admin.

### Q: Does this sync activities back to Salesforce?
**A:** Currently, we create contacts and add notes. Full activity sync is planned for a future update.

### Q: What if I'm a Salesforce admin and want to see what's happening?
**A:** You can monitor:
- New Contacts created (filter by "Created By" = Sales Curiosity Engine)
- Notes added (look for "LinkedIn Outreach Note")
- API usage in Salesforce Setup → System Overview → API Usage

---

## Troubleshooting

### "Connection failed" error
- Make sure you're using the correct Salesforce username/password
- Check that your Salesforce account is active
- Try disconnecting and reconnecting

### "Not authorized" error
- Log out of Sales Curiosity Engine and log back in
- Disconnect Salesforce and reconnect
- Clear browser cache and try again

### Person not found in Salesforce but should be there
- Double-check the email spelling matches exactly
- The person's name must be fairly close (first name or last name)
- They'll be auto-created on first email draft if not found

### "Connected" shows in extension but emails aren't tailored
- Make sure you're generating new emails after connecting
- Check that the LinkedIn profile has an email address
- Refresh the extension and try again

---

## Support

Need help? 
- Check the main user guide for general questions
- Contact your admin if integration settings need adjustment
- Report bugs or issues through the in-app feedback

---

## 🎉 Get Started!

**Ready to supercharge your sales outreach?**

1. Click the **Sales Curiosity** extension icon
2. Go to **Settings** → **Integrations**
3. Click **"Connect Salesforce"**
4. Start generating smarter, CRM-aware emails!

---

*Sales Curiosity Engine - Intelligent CRM-aware sales outreach*

