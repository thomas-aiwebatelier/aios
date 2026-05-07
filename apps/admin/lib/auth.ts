import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const adminEmail = process.env.ADMIN_EMAIL;
        const passwordHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !passwordHash) return null;

        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        if (email.toLowerCase() !== adminEmail.toLowerCase()) return null;

        try {
          const ok = await bcrypt.compare(password, passwordHash);
          return ok ? { id: "admin", email } : null;
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
