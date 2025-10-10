'use client';

import Image from 'next/image';

export default function LogoCarousel() {
  const logos = [
    { name: 'Salesforce', path: '/salesforcelogo.svg' },
    { name: 'Outlook', path: '/outlook.svg' },
    { name: 'HubSpot', path: '/HubSpot_Logo.svg' },
    { name: 'Monday', path: '/Monday_logo.svg' },
    { name: 'Gmail', path: '/gmail_logo_2.svg' },
    { name: 'Google Calendar', path: '/google_cal_logo.svg' },
  ];

  // Duplicate logos for seamless infinite scroll - need 6 sets for perfect loop
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos, ...logos, ...logos];

  return (
    <div className="relative w-full flex justify-center overflow-hidden py-8">
      <div className="relative w-full overflow-hidden">
        {/* Fade edges - fully transparent */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-transparent to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-transparent via-transparent to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling container */}
        <div className="flex items-center animate-scroll-logos-smooth gap-12" style={{ width: 'max-content' }}>
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="flex-shrink-0 flex items-center justify-center w-[160px]"
            >
              <Image
                src={logo.path}
                alt={logo.name}
                width={160}
                height={50}
                className="h-auto w-auto max-h-[45px] max-w-[160px] object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

