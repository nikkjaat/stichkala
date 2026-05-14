import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import ChatPushSubscription from "@/models/ChatPushSubscription";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";

export const dynamic = "force-dynamic";

type Body = {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

/** Store Web Push endpoint for admin devices (requires admin session). */
export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
      !process.env.VAPID_PRIVATE_KEY?.trim()
    ) {
      return NextResponse.json(
        { success: false, error: "Push is not configured on this server." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Body;
    const sub = body.subscription;
    const endpoint = String(sub?.endpoint ?? "").trim();
    const p256dh = String(sub?.keys?.p256dh ?? "").trim();
    const auth = String(sub?.keys?.auth ?? "").trim();
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { success: false, error: "Invalid push subscription." },
        { status: 400 }
      );
    }

    await connectDB();
    await ChatPushSubscription.updateOne(
      { endpoint },
      {
        $set: {
          endpoint,
          keys: { p256dh, auth },
          adminDevice: true,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("chat/push/register-admin:", e);
    return NextResponse.json(
      { success: false, error: "Could not save subscription." },
      { status: 500 }
    );
  }
}
