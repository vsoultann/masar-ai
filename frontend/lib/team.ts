/** The five project members, in the order the project brief specifies.
 *  `roleKey` indexes into the `about` section of the dictionaries. */
export const TEAM = [
  { name: "Mubarak Awad Alamro", roleKey: "roleLead" },
  { name: "Saif Qais", roleKey: "roleFrontend" },
  { name: "Zayed Saif", roleKey: "roleMl" },
  { name: "Khaled Mohammed", roleKey: "roleData" },
  { name: "Mansor Buti", roleKey: "roleQa" },
] as const;

export type TeamMember = (typeof TEAM)[number];
