import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // TODO Task 3.6: re-enqueue the job, reset status to 'queued'
  return NextResponse.json({ ok: true, id, note: "stub — wired in Task 3.6" });
}
