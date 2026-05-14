import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import { notifySubscribersNewProduct } from "@/lib/notifyProductSubscribers";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    const query = showAll ? {} : { inStock: true };
    const products = await Product.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();

    const product = new Product(body);
    await product.save();

    const plain = product.toObject();
    void notifySubscribersNewProduct({
      _id: String(plain._id),
      name: String(plain.name ?? "New product"),
      category: plain.category != null ? String(plain.category) : "",
      images: Array.isArray(plain.images) ? plain.images.map(String) : [],
      description: plain.description != null ? String(plain.description) : "",
      basePrice: Number(plain.basePrice) || 0,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}
