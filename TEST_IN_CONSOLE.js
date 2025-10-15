// ====================================
// PASTE THIS INTO LINKEDIN PAGE CONSOLE
// This tests if DOM extraction works
// ====================================

console.log('🧪 Testing LinkedIn Profile Extraction...');
console.log('📍 URL:', window.location.href);
console.log('📍 Title:', document.title);

// Test H1 extraction (name)
const allH1s = document.querySelectorAll('h1');
console.log('Found H1 elements:', allH1s.length);
allH1s.forEach((h1, i) => {
  console.log(`H1 ${i}:`, h1.textContent?.trim());
});

// Test getting name from first H1
let name = null;
for (const h1 of allH1s) {
  const text = h1.textContent?.trim();
  if (text && text.length > 2 && text.length < 100) {
    name = text;
    console.log('✅ Found name from H1:', name);
    break;
  }
}

// Fallback: try page title
if (!name) {
  const titleMatch = document.title.match(/^([^|]+)/);
  if (titleMatch) {
    name = titleMatch[1].trim();
    console.log('✅ Found name from title:', name);
  }
}

// Test getting main content
const mainContent = document.querySelector('main');
if (mainContent) {
  const fullText = mainContent.textContent?.trim() || '';
  console.log('✅ Got main content, length:', fullText.length, 'chars');
  console.log('📄 First 200 chars:', fullText.substring(0, 200));
}

// Final result
console.log('\n🎯 RESULT:');
console.log('Name:', name);
console.log('Has content:', mainContent ? 'YES' : 'NO');

if (name && mainContent) {
  console.log('\n✅ SUCCESS! The DOM extraction WOULD work if the extension loaded properly.');
} else {
  console.log('\n❌ PROBLEM! Cannot extract data from this page.');
}

