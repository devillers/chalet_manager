import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import {
  adminEmail,
  getAdminUser,
  getTenantUser,
  ownerPassword,
  tenantEmail,
  verifyPassword,
  type Role,
} from "@/lib/auth/users";
import { client } from "@/sanity/lib/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const configuredSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!configuredSecret && process.env.NODE_ENV === "production") {
  throw new Error("Missing AUTH_SECRET (or NEXTAUTH_SECRET).");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: configuredSecret ?? "dev-secret-change-me",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const password = parsed.data.password;

        // 1) Admin (strict email+password)
        if (email === adminEmail.toLowerCase()) {
          const admin = getAdminUser();
          if (!verifyPassword(password, admin.password)) return null;
          return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
        }

        // 2) Tenant (single demo account)
        if (email === tenantEmail.toLowerCase()) {
          const tenant = getTenantUser();
          if (!verifyPassword(password, tenant.password)) return null;
          return { id: tenant.id, email: tenant.email, name: tenant.name, role: tenant.role };
        }

        // 3) Owner (MVP): shared password + resolve ownerSite id from Sanity by email
        if (!verifyPassword(password, ownerPassword)) return null;

        const privateClient = client.withConfig({ useCdn: false });
        const owner = await privateClient.fetch<{
          _id: string;
          ownerName?: string;
          ownerEmail?: string;
        } | null>(
          `*[_type=="ownerSite" && ownerEmail==$email][0]{ _id, ownerName, ownerEmail }`,
          { email }
        );
        if (!owner?._id) return null;

        return {
          id: owner._id,
          email: owner.ownerEmail || email,
          name: owner.ownerName || "Propriétaire",
          role: "owner",
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
