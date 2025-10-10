# Quick Test - Check Session Storage

## After you login, before it redirects:

Open console and run:
```javascript
// Check what's in localStorage
console.log('All localStorage keys:', Object.keys(localStorage));
console.log('Supabase auth:', localStorage.getItem('sales-curiosity-auth'));
console.log('All Supabase keys:', Object.keys(localStorage).filter(k => k.includes('supabase')));
```

## What should be there:
- `sales-curiosity-auth` or `supabase.auth.token` or similar
- Should contain a JWT token

## If nothing is there:
The session isn't being saved to localStorage at all!

---

## Try This Manual Test:

1. Go to /login
2. Open console BEFORE clicking login
3. Paste this:
```javascript
// Watch for storage changes
window.addEventListener('storage', (e) => {
  console.log('Storage changed:', e.key, e.newValue);
});

// Also log localStorage writes
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  console.log('localStorage.setItem:', key);
  return originalSetItem.apply(this, arguments);
};
```
4. Now click Sign In
5. See if localStorage.setItem is called

---

This will tell us if Supabase is even trying to save the session!

