import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminPasswordExpected,
  mintSessionCookieValue,
  verifySessionCookieValue,
} from "@/lib/adminSession";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
  secure: process.env.NODE_ENV === "production",
};

export async function GET() {
  try {
    const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
    const authenticated = await verifySessionCookieValue(token);
    return NextResponse.json({ success: true, authenticated });
  } catch {
    return NextResponse.json(
      { success: false, authenticated: false },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = String(body.password ?? "");
    if (password !== adminPasswordExpected()) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }
    const value = await mintSessionCookieValue();
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, value, COOKIE_OPTIONS);
    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Bad request" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return res;
}
