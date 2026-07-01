import React from 'react';

const Logo = ({ className = "w-8 h-8" }) => (
  <svg 
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`flex-shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="boldBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#111111" />
        <stop offset="100%" stopColor="#555555" />
      </linearGradient>
    </defs>
    
    {/* Bold heavy-weight interlocking T and H */}
    {/* T Shape */}
    <path 
      d="M 6 8 L 34 8 L 34 16 L 24 16 L 24 32 L 16 32 L 16 16 L 6 16 Z" 
      fill="url(#boldBrandGradient)" 
    />
    
    {/* Heavy accent geometric cuts to suggest 'H' */}
    <path 
      d="M 12 24 L 28 24 L 28 32 L 32 32 L 32 16 L 36 16 L 36 36 L 4 36 L 4 16 L 8 16 L 8 32 L 12 32 Z" 
      fill="url(#boldBrandGradient)" 
      opacity="0.8"
    />
  </svg>
);

export default Logo;
