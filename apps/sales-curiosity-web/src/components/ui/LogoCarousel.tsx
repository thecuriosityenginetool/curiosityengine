'use client';

import Image from 'next/image';

export default function LogoCarousel() {
  const logos = [
    { name: 'Gmail', path: '/logos/gmail.svg', width: 120, height: 120 },
    { name: 'Google Calendar', path: '/logos/google-calendar.svg', width: 300, height: 80 },
    { name: 'HubSpot', path: '/logos/hubspot.svg', width: 400, height: 100 },
    { name: 'LinkedIn', path: '/logos/linkedin.svg', width: 500, height: 140 },
    { name: 'Monday', path: '/logos/monday.svg', width: 450, height: 80 },
    { name: 'Salesforce', path: '/logos/salesforce.svg', width: 400, height: 120 },
  ];

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <div className="relative w-full overflow-hidden py-16">
      {/* Fade edges - 10% on each side */}
      <div className="absolute left-0 top-0 bottom-0 w-[10%] bg-gradient-to-r from-white via-white/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-gradient-to-l from-white via-white/90 to-transparent z-10 pointer-events-none" />
      
      {/* Scrolling container */}
      <div className="flex items-center animate-scroll-logos gap-24">
        {duplicatedLogos.map((logo, index) => (
          <div
            key={`${logo.name}-${index}`}
            className="flex-shrink-0 grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 cursor-pointer hover:scale-105 flex items-center justify-center"
            style={{ minWidth: `${logo.width}px`, height: '100px' }}
          >
            <Image
              src={logo.path}
              alt={logo.name}
              width={logo.width}
              height={logo.height}
              className="w-auto h-auto max-h-[80px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

