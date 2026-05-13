import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "./_components/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={session.user?.email} />
      <main className="flex-1 max-w-[1280px] p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
