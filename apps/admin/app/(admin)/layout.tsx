import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { leadIntents } from "@atelier/db";
import { getDb } from "@/lib/db";
import { Sidebar } from "./_components/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // Unhandled front-door requests, badged in the sidebar. Runs on every admin
  // page render, so it stays a COUNT — never fetch the rows here.
  let newLeadCount = 0;
  try {
    const [row] = await getDb()
      .select({ n: count() })
      .from(leadIntents)
      .where(eq(leadIntents.status, "new"));
    newLeadCount = Number(row?.n ?? 0);
  } catch {
    // A badge is not worth taking the whole admin app down for.
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={session.user?.email} newLeadCount={newLeadCount} />
      <main className="flex-1 max-w-[1280px] p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
