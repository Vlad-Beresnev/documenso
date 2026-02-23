import type { ImgHTMLAttributes } from 'react';

export type LogoProps = ImgHTMLAttributes<HTMLImageElement>;

export const BrandingLogoIcon = ({ ...props }: LogoProps) => (
  <img src="/public/glc-logo.svg" alt="GlobalLegalCheck" {...props} />
);
