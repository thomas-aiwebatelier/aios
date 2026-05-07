import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FailedJobs } from "./components/FailedJobs";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600">Welcome, {session?.user?.email}</p>
      <FailedJobs />
    </main>
  );
}
