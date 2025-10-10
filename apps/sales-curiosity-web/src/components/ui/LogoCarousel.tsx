'use client';

import Image from 'next/image';

export default function LogoCarousel() {
  const logos = [
    { name: 'Gmail', path: '/logos/gmail.svg' },
    { name: 'Outlook', path: '/logos/outlook-logo.svg' },
    { name: 'Google Calendar', path: '/logos/google-calendar.svg' },
    { name: 'HubSpot', path: '/logos/hubspot.svg' },
    { name: 'LinkedIn', path: '/logos/linkedin.svg' },
    { name: 'Monday', path: '/logos/monday.svg' },
    { name: 'Salesforce', path: '/logos/salesforce.svg' },
  ];

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <div className="relative w-full flex justify-center overflow-hidden py-12">
      <div className="relative w-[90vw] overflow-hidden">
        {/* Fade edges - 5% on each side */}
        <div className="absolute left-0 top-0 bottom-0 w-[5%] bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-[5%] bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling container - full color, no grayscale */}
        <div className="flex items-center animate-scroll-logos-fast gap-12">
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="flex-shrink-0 transition-all duration-300 hover:scale-110 cursor-pointer flex items-center justify-center"
            >
              <Image
                src={logo.path}
                alt={logo.name}
                width={200}
                height={80}
                className="h-auto w-auto max-h-[60px] max-w-[200px]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

