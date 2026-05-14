import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductSubscriber from "@/models/ProductSubscriber";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PushBody = {
  email?: string;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

/** Store Web Push subscription for an already-subscribed email (public). */
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

    const body = (await request.json()) as PushBody;
    const email = String(body.email ?? "").trim().toLowerCase();
    const sub = body.subscription;
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: "Valid email required." },
        { status: 400 }
      );
    }
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
    const doc = await ProductSubscriber.findOne({
      email: email.slice(0, 320),
      active: true,
    });
    if (!doc) {
      return NextResponse.json(
        {
          success: false,
          error: "Subscribe with your email first, then enable alerts.",
        },
        { status: 404 }
      );
    }

    doc.pushSubscription = { endpoint, keys: { p256dh, auth } };
    await doc.save();

    return NextResponse.json({
      success: true,
      message: "Browser alerts enabled for new products.",
    });
  } catch (e) {
    console.error("subscribe/push POST:", e);
    return NextResponse.json(
      { success: false, error: "Could not save push subscription." },
      { status: 500 }
    );
  }
}
