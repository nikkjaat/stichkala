import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import ProductCategory from "@/models/ProductCategory";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

function decodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Update label / emoji for a custom category (slug unchanged). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const slug = decodeSlug(params.slug).trim().toLowerCase();
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Invalid category." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const label = String(body.label ?? "").trim();
    const emojiRaw = String(body.emoji ?? "").trim();
    const emoji =
      emojiRaw.length > 0 ? emojiRaw.slice(0, 8) : "📦";

    if (!label || label.length > 80) {
      return NextResponse.json(
        { success: false, error: "Label is required (max 80 characters)." },
        { status: 400 }
      );
    }

    await connectDB();
    const doc = await ProductCategory.findOneAndUpdate(
      { slug },
      { $set: { label, emoji } },
      { new: true }
    ).lean();

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category: {
        slug: doc.slug,
        label: doc.label,
        emoji: doc.emoji,
        sortOrder: doc.sortOrder,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 }
    );
  }
}

/** Remove a custom category (no products may use it). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const slug = decodeSlug(params.slug).trim().toLowerCase();
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Invalid category." },
        { status: 400 }
      );
    }

    await connectDB();
    const inUse = await Product.countDocuments({ category: slug });
    if (inUse > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `This category is used by ${inUse} product(s). Change those products to another category first.`,
        },
        { status: 400 }
      );
    }

    const res = await ProductCategory.deleteOne({ slug });
    if (res.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
