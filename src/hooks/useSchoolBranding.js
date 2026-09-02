// ------------------------------------------------------------------
// Single source of truth for school branding.
// RULE: no fake fallbacks (no "Eduzenta School", no fake addresses).
// Priority: fresh /auth/me branding → schools cache → null.
// A null value means branding is still loading — documents render a
// minimal skeleton instead of manufacturing a fake identity.
// ------------------------------------------------------------------
import { useApp } from '../../context/AppContext';

export function useSchoolBranding() {
  const { currentUser, currentSchool } = useApp();

  const name =
    currentSchool?.name ||
    currentUser?.school_name ||
    currentUser?.schoolName ||
    null;

  const logoUrl =
    currentSchool?.logoUrl ||
    currentSchool?.logo_url ||
    currentUser?.school_logo_url ||
    currentUser?.schoolLogoUrl ||
    null;

  const address =
    currentSchool?.address ||
    currentUser?.school_address ||
    null;

  return { name, logoUrl, address, schoolId: currentSchool?.id ?? null };
}
