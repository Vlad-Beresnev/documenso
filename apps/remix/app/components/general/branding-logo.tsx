import type { ImgHTMLAttributes } from 'react';

export type LogoProps = ImgHTMLAttributes<HTMLImageElement>;

export const BrandingLogo = ({ ...props }: LogoProps) => (
  <img src="/glc-logo.svg" alt="GlobalLegalCheck" {...props} />
);
