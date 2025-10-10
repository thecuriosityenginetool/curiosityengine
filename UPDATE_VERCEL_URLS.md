# 🔄 Update Vercel Environment Variables with Your New URL

Your actual Vercel URL is: **`curiosityengine-sales-curiosity-web-neon.vercel.app`**

## **Update These 3 Variables in Vercel:**

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

### **1. NEXT_PUBLIC_APP_URL**
- Find this variable
- Click "Edit"
- Change value to: `https://curiosityengine-sales-curiosity-web-neon.vercel.app`
- Save

### **2. NEXTAUTH_URL**
- Find this variable
- Click "Edit"
- Change value to: `https://curiosityengine-sales-curiosity-web-neon.vercel.app`
- Save

### **3. SALESFORCE_REDIRECT_URI**
- Find this variable
- Click "Edit"
- Change value to: `https://curiosityengine-sales-curiosity-web-neon.vercel.app/api/salesforce/callback`
- Save

---

## **After Updating:**

1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment
3. Click **"Redeploy"**
4. Wait ~3 minutes for new deployment

---

## **Also Update Salesforce:**

Go to Salesforce → Setup → External Client Apps → Sales Curiosity Engine → Settings

Update callback URLs to:
```
https://curiosityengine-sales-curiosity-web-neon.vercel.app/api/salesforce/callback
https://curiosityengine-sales-curiosity-web-neon.vercel.app/api/salesforce/user-callback
```

Save!
