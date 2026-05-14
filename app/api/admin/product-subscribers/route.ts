import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductSubscriber from "@/models/ProductSubscriber";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

/** List product / newsletter subscribers (newest first). Read-only. */
export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    await connectDB();
    const raw = await ProductSubscriber.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .select("email active pushSubscription createdAt")
      .lean();

    const docs = raw as unknown as Array<{
      _id: { toString(): string };
      email?: string;
      active?: boolean;
      pushSubscription?: { endpoint?: string };
      createdAt?: Date;
    }>;

    const subscribers = docs.map((row) => ({
      _id: String(row._id),
      email: String(row.email ?? ""),
      active: Boolean(row.active),
      pushEnabled: Boolean(row.pushSubscription?.endpoint),
      createdAt: row.createdAt
        ? new Date(row.createdAt).toISOString()
        : null,
    }));

    return NextResponse.json({ success: true, subscribers });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to load subscribers" },
      { status: 500 }
    );
  }
}
