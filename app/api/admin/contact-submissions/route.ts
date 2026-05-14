import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ContactFormSubmission from "@/models/ContactFormSubmission";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

/** List contact form submissions (newest first). Read-only for admin dashboard. */
export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    await connectDB();
    const raw = await ContactFormSubmission.find({})
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    const docs = raw as unknown as Array<{
      _id: { toString(): string };
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      createdAt?: Date;
    }>;

    const submissions = docs.map((row) => ({
      _id: String(row._id),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      subject: String(row.subject ?? ""),
      message: String(row.message ?? ""),
      createdAt: row.createdAt
        ? new Date(row.createdAt).toISOString()
        : null,
    }));

    return NextResponse.json({ success: true, submissions });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to load submissions" },
      { status: 500 }
    );
  }
}
