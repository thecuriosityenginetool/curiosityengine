'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // Don't show footer on homepage (it has its own detailed footer)
  // or on dashboard/admin pages (user doesn't want footer when signed in)
  const hideFooter = pathname === '/' || pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');
  
  if (hideFooter) {
    return null;
  }
  
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Curiosity Engine. All rights reserved.
          </div>
          
          <div className="flex gap-6">
            <Link 
              href="/privacy" 
              className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
            >
              Terms of Service
            </Link>
            <a 
              href="mailto:hello@curiosityengine.io" 
              className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

