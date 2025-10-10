'use client';

import Image from 'next/image';

export default function LogoCarousel() {
  const logos = [
    { name: 'Gmail', path: '/logos/gmail-logo.svg' },
    { name: 'Outlook', path: '/logos/outlook-logo.svg' },
    { name: 'HubSpot', path: '/logos/hubspot-logo.svg' },
    { name: 'Monday', path: '/logos/monday-logo.svg' },
    { name: 'Salesforce', path: '/logos/salesforce-logo.svg' },
    { name: 'LinkedIn', path: '/logos/linkedin-logo.svg' },
  ];

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <div className="relative w-full overflow-hidden py-8">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-[10%] bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-[10%] bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      
      {/* Scrolling container */}
      <div className="flex animate-scroll-logos">
        {duplicatedLogos.map((logo, index) => (
          <div
            key={`${logo.name}-${index}`}
            className="flex-shrink-0 mx-8 grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100 cursor-pointer"
          >
            <Image
              src={logo.path}
              alt={logo.name}
              width={140}
              height={40}
              className="h-10 w-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

