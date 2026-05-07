import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        if (creds.email !== process.env.ADMIN_EMAIL) return null;
        const ok = await bcrypt.compare(
          creds.password as string,
          process.env.ADMIN_PASSWORD_HASH!
        );
        return ok ? { id: "admin", email: creds.email as string } : null;
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
