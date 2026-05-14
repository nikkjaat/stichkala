import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import ProductSubscriber from "@/models/ProductSubscriber";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Subscribe email for new product alerts (public). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailRaw = String(body.email ?? "").trim().toLowerCase();
    if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    const email = emailRaw.slice(0, 320);

    await connectDB();
    const existing = await ProductSubscriber.findOne({ email });
    if (existing) {
      existing.active = true;
      await existing.save();
      return NextResponse.json({
        success: true,
        message: "You’re subscribed. We’ll email you when new products go live.",
        pushAvailable: Boolean(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
            process.env.VAPID_PRIVATE_KEY?.trim()
        ),
      });
    }

    try {
      await ProductSubscriber.create({
        email,
        active: true,
        unsubscribeToken: crypto.randomBytes(24).toString("hex"),
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000) {
        const again = await ProductSubscriber.findOne({ email });
        if (again) {
          again.active = true;
          await again.save();
        }
      } else {
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      message: "You’re subscribed. We’ll email you when new products go live.",
      pushAvailable: Boolean(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
          process.env.VAPID_PRIVATE_KEY?.trim()
      ),
    });
  } catch (e) {
    console.error("subscribe POST:", e);
    return NextResponse.json(
      { success: false, error: "Could not save subscription. Try again later." },
      { status: 500 }
    );
  }
}
