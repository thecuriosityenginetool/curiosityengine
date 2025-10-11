'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Define pages where we want to hide the global navigation
  const hideNavigationPages = [
    '/dashboard',
    '/admin',
    '/admin/dashboard',
    '/admin/organization'
  ];
  
  // Check if current path starts with any of the hide navigation pages
  const shouldHideNavigation = hideNavigationPages.some(page => 
    pathname.startsWith(page)
  );
  
  // Don't render navigation on authenticated pages
  if (shouldHideNavigation) {
    return null;
  }
  
  // Show navigation on all other pages (homepage, login, signup, etc.)
  return <Navigation />;
}
