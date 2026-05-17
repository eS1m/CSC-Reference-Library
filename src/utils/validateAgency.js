/**
 * Validate whether an agency profile is complete.
 * Checks all required fields across agency details, head details, and HRM officers.
 * @param {Object} profile - agencyProfiles document data
 * @returns {boolean}
 */
export const validateAgency = (profile) => {
  if (!profile) return false;

  const agencyDetailFields = ['agencyName', 'region', 'resolutionStatus', 'sector', 'status'];
  const agencyDone = agencyDetailFields.every(
    (field) => profile.agencyDetails?.[field]?.toString().trim()
  );

  const headDone = !!(
    profile.headDetails?.name?.trim() &&
    profile.headDetails?.designation?.trim()
  );

  const hrmDone = !!(
    profile.hrmOfficers?.[0]?.name?.trim() &&
    profile.hrmOfficers?.[0]?.email?.trim()
  );

  return agencyDone && headDone && hrmDone;
};
