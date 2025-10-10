import React from "react";

interface LogoProps {
  size?: number;
  variant?: 'full' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ size = 40, variant = 'icon' }) => {
  // Use the DSPGEN.AI logo
  const logoSrc = variant === 'full' 
    ? '/logo-full.png'  // Full logo with text
    : '/logo-icon.png';  // Icon only
  
  return (
    <div style={{
      width: size,
      height: size,
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <img
        src={chrome.runtime.getURL(`icons/${logoSrc.replace('/', '')}`)}
        alt="Sales Curiosity Logo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export const LogoSmall: React.FC<{ size?: number }> = ({ size = 20 }) => {
  return <Logo size={size} variant="icon" />;
};

