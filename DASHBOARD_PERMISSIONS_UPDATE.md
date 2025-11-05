# Dashboard Settings - Permissions & Sharing Update ✅

**Date:** November 5, 2025  
**Status:** ✅ Ready to Test

---

## 🎯 What's Been Updated

The Settings tab in the main dashboard (`/dashboard`) has been updated to integrate with the new permission system and organization storage features.

---

## ✨ New Features in Settings Tab

### 1️⃣ **User Permissions Display**

A new permissions card shows your current access rights:

```
📋 Your Permissions
✓ Upload materials        ✓ Share materials
✓ View team materials     ✓ Delete own materials
```

- **Green checkmark (✓)** = Permission granted
- **Gray X (✗)** = Permission denied
- Updates dynamically based on org admin settings

---

### 2️⃣ **Materials Organized by Owner**

Materials are now separated into two sections:

#### **📁 My Materials**
- Your personally uploaded materials
- Shows visibility status badges:
  - 🔒 **Private** - Only you can see
  - 👥 **Team** - Shared with specific users
  - 🌐 **Org** - Shared with entire organization
- Share button (🔄) to change visibility
- Delete button (🗑️) if you have permission

#### **👥 Team Materials**
- Materials shared by other team members
- Shows who uploaded each file
- Blue-tinted background to distinguish from your materials
- Read-only (can't delete or modify)

---

### 3️⃣ **Material Sharing Functionality**

Each of your materials now has a share button (🔄) that reveals options:

- **🔒 Make Private** - Only you can see it
- **🌐 Share with Organization** - All team members can view

**How it works:**
1. Hover over the 🔄 button on your material
2. Click the visibility option you want
3. Material updates instantly
4. Team members can immediately see shared materials

---

### 4️⃣ **Enhanced Material Display**

Each material now shows:

**For Your Materials:**
- File name
- Visibility badge (Private/Team/Org)
- Category, size, upload date
- "Shared [date]" if material has been shared
- Share and delete buttons (based on permissions)

**For Team Materials:**
- File name
- "Shared" or "Team" badge
- Category and size
- Uploader's name/email
- Blue background for easy identification

---

## 📸 What You'll See

### Permissions Card (Top of materials section):
```
┌─────────────────────────────────────┐
│ 📋 Your Permissions                 │
│ ✓ Upload materials   ✓ Share       │
│ ✓ View team         ✓ Delete own   │
└─────────────────────────────────────┘
```

### My Materials Section:
```
📁 My Materials (2)

┌─────────────────────────────────────┐
│ Product Guide.pdf  🌐 Org           │
│ sales_guide • 234 KB • 11/5/2025   │
│ Shared 11/5/2025                    │
│                          🔄    🗑️   │
└─────────────────────────────────────┘
```

### Team Materials Section:
```
👥 Team Materials (1)

┌─────────────────────────────────────┐ (Blue background)
│ Sales Playbook.pdf  🌐 Shared       │
│ pitch_deck • 1.2 MB                 │
│ By: John Doe                        │
└─────────────────────────────────────┘
```

---

## 🔄 How Sharing Works

### To Share a Material:

1. Go to **Settings** tab
2. Scroll to your materials
3. Find the material you want to share
4. **Hover** over the 🔄 button
5. Click **"🌐 Share with Organization"**
6. ✅ Done! All team members can now see it

### To Make a Material Private Again:

1. Find the shared material (has 🌐 Org badge)
2. **Hover** over the 🔄 button  
3. Click **"🔒 Make Private"**
4. ✅ Material is now private again

---

## 🔐 Permission Requirements

### To Upload Materials:
- ✅ Must have `can_upload_materials` permission
- Default: Granted to all users

### To Share Materials:
- ✅ Must have `can_share_materials` permission
- ✅ Must own the material
- Default: Granted to all users, but can be restricted by admin

### To Delete Materials:
- ✅ Must have `can_delete_own_materials` permission (for your materials)
- ✅ OR be an org admin with `can_delete_org_materials` (for any material)
- Default: Granted to all users for own materials

### To View Team Materials:
- ✅ Must have `can_view_org_materials` permission
- ✅ Material must be shared (organization or team visibility)
- Default: Granted to all users

---

## 🎨 Visual Design Updates

### Color Coding:
- **Your materials** = Gray background
- **Team materials** = Blue background (easier to distinguish)
- **Private badge** = Gray (`🔒 Private`)
- **Team badge** = Blue (`👥 Team`)
- **Org badge** = Green (`🌐 Org`)

### Interactive Elements:
- **Share button (🔄)** appears on hover
- Dropdown menu shows on hover
- Smooth transitions and hover states
- Clear visual feedback for all actions

---

## 🧪 Testing the New Features

### Test Permissions Display:

1. Go to http://localhost:3000/dashboard
2. Click **Settings** tab
3. Scroll to sales materials section
4. You should see the permissions card at the top
5. Verify your permissions show correctly

### Test Material Upload:

1. Click the upload area
2. Select a PDF or DOCX file
3. After upload, verify it appears under "📁 My Materials"
4. Check that it shows "🔒 Private" badge

### Test Sharing:

1. Find a material in "My Materials"
2. Hover over the 🔄 button
3. Click "🌐 Share with Organization"
4. Verify badge changes to "🌐 Org"
5. Badge should update instantly

### Test Team Materials View:

1. Have another user upload and share a material
2. Refresh your dashboard
3. Their shared material should appear under "👥 Team Materials"
4. Verify you can see their name
5. Verify you can't delete it (no 🗑️ button)

### Test Making Private:

1. Find a shared material (has 🌐 Org badge)
2. Hover over 🔄 button
3. Click "🔒 Make Private"
4. Badge changes to "🔒 Private"
5. Other users can no longer see it

---

## 🔧 Technical Changes

### State Updates:
```typescript
const [userPermissions, setUserPermissions] = useState<any>(null);
```

### New API Integration:
```typescript
// GET /api/sales-materials now returns:
{
  materials: [...],
  permissions: {
    can_upload_materials: true,
    can_share_materials: true,
    can_view_org_materials: true,
    can_delete_own_materials: true
  }
}
```

### New Share Function:
```typescript
async function shareMaterial(materialId, visibility) {
  // Calls POST /api/sales-materials/share
  // Updates material visibility
  // Reloads materials list
}
```

### Material Properties:
```typescript
material.visibility      // 'private' | 'team' | 'organization'
material.is_owner       // boolean
material.can_share      // boolean
material.can_delete     // boolean
material.owner          // { full_name, email }
material.shared_at      // timestamp
```

---

## ✅ Testing Checklist

- [ ] Permissions card displays correctly
- [ ] Materials are separated into "My" and "Team" sections
- [ ] Visibility badges show on each material
- [ ] Can upload new material (appears in "My Materials")
- [ ] Share button (🔄) appears on your materials
- [ ] Can share material with organization
- [ ] Badge updates when sharing
- [ ] Can make shared material private again
- [ ] Team materials appear in separate section
- [ ] Can see who uploaded team materials
- [ ] Can't delete team materials (no button)
- [ ] Delete button works on own materials
- [ ] Empty state shows when no materials uploaded

---

## 🐛 Troubleshooting

### Permissions Card Not Showing

**Problem:** Permissions card is blank or not appearing  
**Solution:** 
1. Check that database migration ran successfully
2. Verify `user_permissions` table has data for your user
3. Check browser console for API errors

### Can't See Share Button

**Problem:** Share button (🔄) doesn't appear  
**Solution:**
1. Verify you have `can_share_materials` permission
2. Check that you own the material (`is_owner = true`)
3. Try refreshing the page

### Team Materials Not Showing

**Problem:** Can't see materials shared by teammates  
**Solution:**
1. Verify you have `can_view_org_materials` permission
2. Check that teammate actually shared material (not private)
3. Confirm you're in the same organization
4. Try refreshing the page

### Share Doesn't Work

**Problem:** Clicking share button does nothing  
**Solution:**
1. Open browser console to see errors
2. Verify API endpoint `/api/sales-materials/share` exists
3. Check that material exists and you own it
4. Try restarting the dev server

---

## 📝 Summary

The Settings tab now provides a complete team collaboration experience:

✅ **See your permissions** at a glance  
✅ **Organize materials** into personal vs team  
✅ **Share materials** with one click  
✅ **View team materials** uploaded by others  
✅ **Visual indicators** for privacy levels  
✅ **Permission-based actions** (share/delete)  

All changes are backward compatible and work seamlessly with the new permission system!

---

**Next:** Test the features and provide feedback for any improvements needed.

