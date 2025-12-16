export type Role = "admin" | "owner" | "tenant";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
};

export const adminEmail = process.env.ADMIN_EMAIL || "admin@demo.com";
export const adminPassword = process.env.ADMIN_PASSWORD || "admin";

// For owners, we support a shared password (MVP). Owner identity is resolved from Sanity by email.
export const ownerPassword = process.env.OWNER_PASSWORD || "owner";

export const tenantEmail = process.env.TENANT_EMAIL || "tenant@demo.com";
export const tenantPassword = process.env.TENANT_PASSWORD || "tenant";
export const tenantId = process.env.TENANT_ID || "tenant-demo";

export function verifyPassword(inputPassword: string, expectedPassword: string) {
  // MVP: plain compare. Replace by hashed passwords (bcrypt/scrypt) before production.
  return inputPassword === expectedPassword;
}

export function getAdminUser() {
  return {
    id: "admin",
    email: adminEmail,
    name: "Admin",
    role: "admin" as const,
    password: adminPassword,
  } satisfies AppUser;
}

export function getTenantUser() {
  return {
    id: tenantId,
    email: tenantEmail,
    name: "Locataire",
    role: "tenant" as const,
    password: tenantPassword,
  } satisfies AppUser;
}
