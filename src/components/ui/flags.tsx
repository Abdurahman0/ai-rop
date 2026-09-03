"use client";

import type { Locale } from "@/i18n/dictionaries";

/**
 * Inline SVG flags. Emoji flags are unreliable — Chrome on Linux and Windows
 * render regional-indicator pairs as bare letters — so the marks are drawn.
 */
export function Flag({ locale, className = "" }: { locale: Locale; className?: string }) {
  const common = `h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-black/10 ${className}`;

  if (locale === "ru") {
    return (
      <svg viewBox="0 0 20 14" className={common} aria-hidden focusable="false">
        <rect width="20" height="14" fill="#fff" />
        <rect y="4.67" width="20" height="4.66" fill="#0039a6" />
        <rect y="9.33" width="20" height="4.67" fill="#d52b1e" />
      </svg>
    );
  }

  if (locale === "uz") {
    return (
      <svg viewBox="0 0 20 14" className={common} aria-hidden focusable="false">
        <rect width="20" height="14" fill="#fff" />
        <rect width="20" height="4.4" fill="#0099b5" />
        <rect y="9.6" width="20" height="4.4" fill="#1eb53a" />
        <rect y="4.15" width="20" height="0.5" fill="#ce1126" />
        <rect y="9.35" width="20" height="0.5" fill="#ce1126" />
        <circle cx="4" cy="2.2" r="1.35" fill="#fff" />
        <circle cx="4.65" cy="2.2" r="1.35" fill="#0099b5" />
        <circle cx="7.1" cy="1.5" r="0.32" fill="#fff" />
        <circle cx="7.1" cy="2.9" r="0.32" fill="#fff" />
        <circle cx="8.6" cy="1.5" r="0.32" fill="#fff" />
        <circle cx="8.6" cy="2.9" r="0.32" fill="#fff" />
      </svg>
    );
  }

  // English -> Union Jack
  return (
    <svg viewBox="0 0 20 14" className={common} aria-hidden focusable="false">
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#fff" strokeWidth="2.8" />
      <path d="M0 0 L20 14 M20 0 L0 14" stroke="#c8102e" strokeWidth="1.4" />
      <path d="M10 0 V14 M0 7 H20" stroke="#fff" strokeWidth="4" />
      <path d="M10 0 V14 M0 7 H20" stroke="#c8102e" strokeWidth="2.2" />
    </svg>
  );
}
