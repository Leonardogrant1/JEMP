import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, source: "waitlist", subscribed: true }),
  });

  if (!res.ok) {
    const body = await res.json();
    return NextResponse.json({ error: body.message ?? "Failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
