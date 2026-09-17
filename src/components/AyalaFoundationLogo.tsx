import React from 'react';
import ayalaLogoImg from '../assets/images/regenerated_image_1787722372003.png';

interface AyalaFoundationLogoProps {
  className?: string;
  height?: number | string;
  width?: number | string;
  showText?: boolean;
}

export const AyalaFoundationLogo: React.FC<AyalaFoundationLogoProps> = ({
  className = '',
  height = 80,
  width = 200,
  showText = true,
}) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <img
        src={ayalaLogoImg}
        alt="Ayala Foundation"
        style={{ height, width }}
        className="object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};


