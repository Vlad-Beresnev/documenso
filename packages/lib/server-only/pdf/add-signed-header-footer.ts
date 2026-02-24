import { type PDF, rgb } from '@libpdf/core';
import { DateTime } from 'luxon';
import fs from 'node:fs';
import path from 'node:path';

import { svgToPng } from '../../utils/images/svg-to-png';

// GLC brand colours
const GLC_BLUE = rgb(0 / 255, 124 / 255, 250 / 255);
const DARK_NAVY = rgb(26 / 255, 43 / 255, 74 / 255);
const MUTED_GRAY = rgb(100 / 255, 116 / 255, 139 / 255);

const HEADER_HEIGHT = 22; // pts
const FOOTER_HEIGHT = 20; // pts
const LOGO_HEIGHT = 12; // pts
const LOGO_WIDTH = Math.round((12 * 216) / 195); // pts — preserves 216:195 aspect ratio
const FONT_SIZE = 7; // pts
const PADDING = 8; // pts from edges
const BORDER_THICKNESS = 0.75; // pts

export type AddSignedHeaderFooterOptions = {
  /** The PDF document to mutate. */
  pdf: PDF;
  /** Number of original document pages (header/footer is NOT applied to certificate/audit pages). */
  originalPageCount: number;
  /** Human-readable document title shown in the header. */
  documentTitle: string;
  /** Unique document reference shown in the footer. */
  documentId: string | number;
  /** Timestamp used in the footer. */
  signedAt: Date;
  /** Optional signature field secondaryId shown in the header. */
  signatureId?: string;
};

/**
 * Stamps a GLC-branded header and footer onto each original page of a signed PDF.
 *
 * Header:
 *   Left  — GLC logo + "GlobalLegalCheck — <document title>"
 *   Right — "Electronically signed | Sig ID: <id>"
 *   Bottom border — thin blue line
 *
 * Footer:
 *   Top border — thin blue line
 *   Left  — GLC logo + "Doc ID: <id>"
 *   Center — "This document is legally signed"
 *   Right  — "Signed: <timestamp> | Page X of N"
 */
export async function addSignedHeaderFooter({
  pdf,
  originalPageCount,
  documentTitle,
  documentId,
  signedAt,
  signatureId,
}: AddSignedHeaderFooterOptions): Promise<void> {
  // Load font from disk (same pattern as render-certificate.ts / render-audit-logs.ts)
  const fontPath = path.join(process.cwd(), 'public/fonts/noto-sans.ttf');
  const fontBytes = fs.readFileSync(fontPath);
  const font = pdf.embedFont(fontBytes);

  // Convert GLC SVG logo → PNG and embed into the PDF once
  const svgPath = path.join(process.cwd(), 'public/glc-logo.svg');
  const svgString = fs.readFileSync(svgPath, 'utf-8');
  const logoPngBuffer = await svgToPng(svgString);
  const logoImage = pdf.embedImage(new Uint8Array(logoPngBuffer));

  const formattedDate = DateTime.fromJSDate(signedAt)
    .setZone('UTC')
    .toFormat('yyyy-MM-dd HH:mm:ss z');

  const pages = pdf.getPages();

  for (let i = 0; i < originalPageCount; i++) {
    const page = pages[i];

    if (!page) continue;

    const { width, height } = page;
    const pageNum = i + 1;

    // Vertical centre for text within the header/footer band
    const headerTextY = height - HEADER_HEIGHT + (HEADER_HEIGHT - FONT_SIZE) / 2 - 1;
    const footerTextY = (FOOTER_HEIGHT - FONT_SIZE) / 2 - 1;

    // ── HEADER ─────────────────────────────────────────────────────────────

    // Blue border line at the bottom edge of the header band
    page.drawRectangle({
      x: 0,
      y: height - HEADER_HEIGHT,
      width,
      height: BORDER_THICKNESS,
      color: GLC_BLUE,
    });

    // Logo (left side, vertically centred in header)
    const logoY = height - HEADER_HEIGHT + (HEADER_HEIGHT - LOGO_HEIGHT) / 2;

    page.drawImage(logoImage, {
      x: PADDING,
      y: logoY,
      height: LOGO_HEIGHT,
      width: LOGO_WIDTH,
    });

    // "GlobalLegalCheck — <title>" next to the logo
    const MAX_TITLE_CHARS = 55;
    const truncatedTitle =
      documentTitle.length > MAX_TITLE_CHARS
        ? documentTitle.substring(0, MAX_TITLE_CHARS) + '...'
        : documentTitle;

    const leftHeaderText = `GlobalLegalCheck  \u2014  ${truncatedTitle}`;

    page.drawText(leftHeaderText, {
      x: PADDING + LOGO_WIDTH + 4,
      y: headerTextY,
      size: FONT_SIZE,
      font,
      color: DARK_NAVY,
    });

    // Right: "Electronically signed | Sig ID: <id>"
    const sigText = signatureId
      ? `Electronically signed  |  Sig ID: ${signatureId}`
      : 'Electronically signed via GlobalLegalCheck';

    const sigTextWidth = font.getTextWidth(sigText, FONT_SIZE);

    page.drawText(sigText, {
      x: width - sigTextWidth - PADDING,
      y: headerTextY,
      size: FONT_SIZE,
      font,
      color: MUTED_GRAY,
    });

    // ── FOOTER ─────────────────────────────────────────────────────────────

    // Blue border line at the top edge of the footer band
    page.drawRectangle({
      x: 0,
      y: FOOTER_HEIGHT - BORDER_THICKNESS,
      width,
      height: BORDER_THICKNESS,
      color: GLC_BLUE,
    });

    // Logo (left side, vertically centred in footer)
    const footerLogoHeight = LOGO_HEIGHT - 2;
    const footerLogoY = (FOOTER_HEIGHT - footerLogoHeight) / 2;

    const footerLogoWidth = Math.round((footerLogoHeight * 216) / 195);

    page.drawImage(logoImage, {
      x: PADDING,
      y: footerLogoY,
      height: footerLogoHeight,
      width: footerLogoWidth,
    });

    // Left: "Doc ID: <id>"
    page.drawText(`Doc ID: ${documentId}`, {
      x: PADDING + footerLogoWidth + 4,
      y: footerTextY,
      size: FONT_SIZE,
      font,
      color: MUTED_GRAY,
    });

    // Center: "This document is legally signed"
    const centerText = 'This document is legally signed';
    const centerTextWidth = font.getTextWidth(centerText, FONT_SIZE);

    page.drawText(centerText, {
      x: (width - centerTextWidth) / 2,
      y: footerTextY,
      size: FONT_SIZE,
      font,
      color: DARK_NAVY,
    });

    // Right: "Signed: <timestamp> | Page X of N"
    const rightText = `Signed: ${formattedDate}  |  Page ${pageNum} of ${originalPageCount}`;
    const rightTextWidth = font.getTextWidth(rightText, FONT_SIZE);

    page.drawText(rightText, {
      x: width - rightTextWidth - PADDING,
      y: footerTextY,
      size: FONT_SIZE,
      font,
      color: MUTED_GRAY,
    });
  }
}
