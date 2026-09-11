/** The five project members, group leader first.
 *  `roleKey` indexes into the `about` section of the dictionaries. */
export const TEAM = [
  { name: "Saif Qais Ahmed", roleKey: "roleLead" },
  { name: "Khaled Mohammed AlMemari", roleKey: "roleData" },
  { name: "Mansour Buti ALShmasi", roleKey: "roleQa" },
  { name: "Mubarak Awad AlAmro", roleKey: "roleBackend" },
  { name: "Zayed Saif AlBlooshi", roleKey: "roleMl" },
] as const;

/** Named separately from TEAM so the supervisor is never rendered as a member. */
export const SUPERVISOR = "Hamdy Hersi";
export const INSTITUTION = "Applied Technology School — Al Ain";
export const ACADEMIC_YEAR = "2026";

export type TeamMember = (typeof TEAM)[number];
