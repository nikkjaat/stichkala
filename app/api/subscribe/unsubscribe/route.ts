import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductSubscriber from "@/models/ProductSubscriber";
import { getPublicSiteOrigin } from "@/lib/siteUrl";

const TOKEN_RE = /^[a-f0-9]{48}$/i;

/** One-click unsubscribe from new product emails (GET link from mail). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!TOKEN_RE.test(token)) {
    return NextResponse.redirect(new URL("/?sub=invalid", getPublicSiteOrigin()));
  }
  try {
    await connectDB();
    const r = await ProductSubscriber.updateOne(
      { unsubscribeToken: token },
      { $set: { active: false }, $unset: { pushSubscription: 1 } }
    );
    if (r.matchedCount === 0) {
      return NextResponse.redirect(new URL("/?sub=unknown", getPublicSiteOrigin()));
    }
    return NextResponse.redirect(new URL("/?sub=off", getPublicSiteOrigin()));
  } catch (e) {
    console.error("unsubscribe GET:", e);
    return NextResponse.redirect(new URL("/?sub=error", getPublicSiteOrigin()));
  }
}
