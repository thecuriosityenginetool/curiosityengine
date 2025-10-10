'use client';

import Image from 'next/image';

export default function LogoCarousel() {
  const logos = [
    { name: 'Gmail', path: '/logos/gmail.svg', width: 200 },
    { name: 'Google Calendar', path: '/logos/google-calendar.svg', width: 240 },
    { name: 'HubSpot', path: '/logos/hubspot.svg', width: 240 },
    { name: 'LinkedIn', path: '/logos/linkedin.svg', width: 240 },
    { name: 'Monday', path: '/logos/monday.svg', width: 300 },
    { name: 'Salesforce', path: '/logos/salesforce.svg', width: 280 },
  ];

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <div className="relative w-full overflow-hidden py-12">
      {/* Fade edges - 10% on each side */}
      <div className="absolute left-0 top-0 bottom-0 w-[10%] bg-gradient-to-r from-white via-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-gradient-to-l from-white via-white to-transparent z-10 pointer-events-none" />
      
      {/* Scrolling container */}
      <div className="flex items-center animate-scroll-logos gap-16">
        {duplicatedLogos.map((logo, index) => (
          <div
            key={`${logo.name}-${index}`}
            className="flex-shrink-0 grayscale hover:grayscale-0 transition-all duration-500 opacity-70 hover:opacity-100 cursor-pointer hover:scale-110"
            style={{ minWidth: `${logo.width}px` }}
          >
            <Image
              src={logo.path}
              alt={logo.name}
              width={logo.width}
              height={60}
              className="h-[60px] w-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

