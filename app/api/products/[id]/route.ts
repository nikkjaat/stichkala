import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import Product from "@/models/Product";
import mongoose from "mongoose";
import { deleteImageByUrl } from "@/lib/cloudinary";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

/** Public read for storefront / chat preview. Optional threadId+clientId returns active negotiated offer for that product. */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const product = await Product.findById(params.id).lean();
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const threadId = request.nextUrl.searchParams.get('threadId')?.trim();
    const clientId = request.nextUrl.searchParams.get('clientId')?.trim();
    let negotiatedOffer: {
      amountRupees: number;
      listPriceRupees: number;
      payToken: string;
      expiresAt: string;
    } | null = null;

    if (
      threadId &&
      clientId &&
      mongoose.Types.ObjectId.isValid(threadId) &&
      mongoose.Types.ObjectId.isValid(params.id)
    ) {
      const ChatThread = (await import('@/models/ChatThread')).default;
      const th = await ChatThread.findById(threadId).lean();
      const pid = String(params.id);
      if (
        th &&
        th.clientId === clientId &&
        th.payOfferToken &&
        !th.payOfferUsedAt &&
        th.payOfferExpiresAt &&
        new Date(th.payOfferExpiresAt).getTime() > Date.now() &&
        th.payOfferProductId &&
        String(th.payOfferProductId) === pid &&
        typeof th.payOfferAmountRupees === 'number'
      ) {
        const list =
          typeof th.payOfferListPriceRupees === 'number'
            ? th.payOfferListPriceRupees
            : Math.round(Number(product.basePrice) * 100) / 100;
        negotiatedOffer = {
          amountRupees: th.payOfferAmountRupees,
          listPriceRupees: list,
          payToken: th.payOfferToken,
          expiresAt: new Date(th.payOfferExpiresAt).toISOString(),
        };
      }
    }

    return NextResponse.json({
      success: true,
      product,
      ...(negotiatedOffer ? { negotiatedOffer } : {}),
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await request.json();

    const existingProduct = await Product.findById(params.id);

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const oldImages = existingProduct.images || [];
    const newImages = body.images || [];

    const imagesToDelete = oldImages.filter((oldImg: string) => !newImages.includes(oldImg));

    for (const imageUrl of imagesToDelete) {
      try {
        await deleteImageByUrl(imageUrl);
      } catch (error) {
        console.error(`Failed to delete image: ${imageUrl}`, error);
      }
    }

    const product = await Product.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const product = await Product.findById(params.id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const images = product.images || [];
    for (const imageUrl of images) {
      try {
        await deleteImageByUrl(imageUrl);
      } catch (error) {
        console.error(`Failed to delete image: ${imageUrl}`, error);
      }
    }

    await Product.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
