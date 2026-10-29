export function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? full.trim(),
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : undefined,
    lastName: parts.length > 1 ? parts[parts.length - 1] : undefined,
  };
}

export const buildFullName = (p: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
}) => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ").trim();