import React from 'react';
import { useApp } from '../../context/AppContext';

/**
 * Single source of truth for school branding in ALL pages and PDF templates.
 * Values come ONLY from the authenticated context (currentSchool hydrated from
 * /auth/me + branding state). NO fake fallbacks (no "Eduzenta School", no
 * "Education Boulevard") — empty strings when the server has no data yet.
 */
export function useSchoolInfo() {
  const { currentUser, currentSchool } = useApp();
  const pick = (...vals) => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };
  return {
    name: pick(currentSchool?.name, currentUser?.schoolName, currentUser?.school_name),
    logoUrl: pick(
      currentSchool?.logoUrl,
      currentSchool?.logo_url,
      currentUser?.schoolLogoUrl,
      currentUser?.school_logo_url
    ),
    address: pick(currentSchool?.address, currentUser?.school_address, currentUser?.schoolAddress)
  };
}

/**
 * School logo image with a neutral initial-emblem fallback.
 * Never renders a fake school identity — only the real uploaded logo, or a
 * clean initial badge derived from the real school name.
 */
export function SchoolLogo({ logoUrl, name, size = 'w-9 h-9', className = '' }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name || 'School logo'}
        className={`${size} rounded-lg object-contain bg-white border border-slate-200 ${className}`}
      />
    );
  }
  const initial = (name || 'S').trim().charAt(0).toUpperCase() || 'S';
  return (
    <div
      className={`${size} rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black ${className}`}
      aria-label={name || 'School'}
    >
      {initial}
    </div>
  );
}