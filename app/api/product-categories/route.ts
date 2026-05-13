import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ProductCategory from "@/models/ProductCategory";

/** Public list: categories saved in DB by admin (shop filters + admin product form). */
export async function GET() {
  try {
    await connectDB();
    const rows = await ProductCategory.find()
      .sort({ sortOrder: 1, label: 1 })
      .lean();

    const categories = rows.map((c) => ({
      slug: String(c.slug),
      label: String(c.label ?? c.slug),
      emoji: String(c.emoji ?? "📦"),
      sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : 100,
    }));

    return NextResponse.json({ success: true, categories });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to load categories" },
      { status: 500 }
    );
  }
}
