import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatPushSubscription from "@/models/ChatPushSubscription";

export const dynamic = "force-dynamic";

type Body = {
  clientId?: string;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

/** Store Web Push endpoint for this visitor chat client (public). */
export async function POST(request: NextRequest) {
  try {
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
    const clientId = String(body.clientId ?? "").trim();
    const sub = body.subscription;
    const endpoint = String(sub?.endpoint ?? "").trim();
    const p256dh = String(sub?.keys?.p256dh ?? "").trim();
    const auth = String(sub?.keys?.auth ?? "").trim();

    if (!clientId || clientId.length > 200) {
      return NextResponse.json(
        { success: false, error: "clientId required." },
        { status: 400 }
      );
    }
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
          visitorClientId: clientId,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("chat/push/register-visitor:", e);
    return NextResponse.json(
      { success: false, error: "Could not save subscription." },
      { status: 500 }
    );
  }
}
