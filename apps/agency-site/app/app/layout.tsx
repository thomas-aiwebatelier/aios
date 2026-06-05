import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PortalNav from "@/components/PortalNav";

export const metadata: Metadata = {
  title: "Portaal — AI Web Atelier",
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const user = await getUser(supabase);
  if (!user) redirect("/login?next=/app");

  return (
    <div className="portal">
      <PortalNav email={user.email} />
      <div className="portal__body">{children}</div>
    </div>
  );
}
