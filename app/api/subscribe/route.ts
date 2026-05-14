import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import connectDB from "@/lib/mongodb";
import ProductSubscriber from "@/models/ProductSubscriber";
import { getPublicSiteOrigin } from "@/lib/siteUrl";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendSubscriberThankYouEmail(
  to: string,
  unsubscribeToken: string
): Promise<void> {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASSWORD?.trim();
  if (!emailUser || !emailPass) {
    console.warn(
      "subscribe: EMAIL_USER / EMAIL_PASSWORD not set; skipping thank-you email."
    );
    return;
  }

  const origin = getPublicSiteOrigin();
  const shopUrl = `${origin}/products`;
  const unsubUrl = `${origin}/api/subscribe/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPass },
  });

  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto;">
      <h1 style="color:#be123c;font-size:22px;">Thank you for subscribing</h1>
      <p style="color:#334155;font-size:16px;line-height:1.6;">
        Hi there,
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;">
        You’re now on the StichKala list. We’ll let you know when we add new handmade pieces to the shop.
      </p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(shopUrl)}" style="display:inline-block;background:#e11d48;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;">Browse products</a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">
        <a href="${escapeHtml(unsubUrl)}" style="color:#64748b;">Unsubscribe from new product emails</a>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: emailUser,
    to,
    subject: "Thank you for subscribing — StichKala",
    html,
  });
}

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
    let subscriber = (await ProductSubscriber.findOne({ email }).lean()) as {
      email: string;
      unsubscribeToken: string;
    } | null;

    if (subscriber) {
      await ProductSubscriber.updateOne(
        { email },
        { $set: { active: true } }
      );
    } else {
      try {
        await ProductSubscriber.create({
          email,
          active: true,
          unsubscribeToken: crypto.randomBytes(24).toString("hex"),
        });
      } catch (err: unknown) {
        const code = (err as { code?: number })?.code;
        if (code !== 11000) throw err;
      }
      subscriber = (await ProductSubscriber.findOne({ email }).lean()) as {
        email: string;
        unsubscribeToken: string;
      } | null;
      if (subscriber) {
        await ProductSubscriber.updateOne(
          { email },
          { $set: { active: true } }
        );
      }
    }

    if (subscriber?.unsubscribeToken) {
      try {
        await sendSubscriberThankYouEmail(
          subscriber.email,
          subscriber.unsubscribeToken
        );
      } catch (mailErr) {
        console.error("subscribe: thank-you email failed", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "You’re subscribed. Check your inbox for a thank-you message (and we’ll email you when new products go live).",
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
