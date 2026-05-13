import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductCategory from "@/models/ProductCategory";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";
import { slugifyCategoryLabel } from "@/lib/productCategoryCatalog";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

/** Create a custom product category (slug derived from label). */
export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
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

    const slug = slugifyCategoryLabel(label);

    await connectDB();
    const existing = await ProductCategory.findOne({ slug }).lean();
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A category with a similar name already exists. Try a different label.",
        },
        { status: 409 }
      );
    }

    const maxSort = await ProductCategory.findOne()
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();
    const sortOrder =
      (typeof maxSort?.sortOrder === "number" ? maxSort.sortOrder : 99) + 1;

    const doc = await ProductCategory.create({
      slug,
      label,
      emoji,
      sortOrder,
    });

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
      { success: false, error: "Failed to create category" },
      { status: 500 }
    );
  }
}
