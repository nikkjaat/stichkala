import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import Product from "@/models/Product";
import { getRazorpayPublicKey, isRazorpayConfigured } from "@/lib/razorpayConfig";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token?.trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 400 }
      );
    }
    await connectDB();
    const thread = await ChatThread.findOne({ payOfferToken: token });
    if (!thread?.payOfferRazorpayOrderId || !thread.payOfferAmountRupees) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }
    if (thread.payOfferUsedAt) {
      return NextResponse.json(
        { success: false, error: "This payment link was already used" },
        { status: 410 }
      );
    }
    if (
      thread.payOfferExpiresAt &&
      new Date(thread.payOfferExpiresAt).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { success: false, error: "This offer has expired" },
        { status: 410 }
      );
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "payment_unavailable",
          message:
            "Card/UPI checkout is temporarily unavailable. Ask the shop to resend the offer or pay via chat UPI.",
        },
        { status: 503 }
      );
    }

    const product = thread.payOfferProductId
      ? await Product.findById(thread.payOfferProductId).lean()
      : null;

    return NextResponse.json({
      success: true,
      amountRupees: thread.payOfferAmountRupees,
      listPriceRupees:
        typeof thread.payOfferListPriceRupees === "number"
          ? thread.payOfferListPriceRupees
          : product != null && product.basePrice != null
            ? Math.round(Number(product.basePrice) * 100) / 100
            : undefined,
      razorpayOrderId: thread.payOfferRazorpayOrderId,
      keyId: getRazorpayPublicKey(),
      productName: product?.name || thread.productName || "Product",
      threadId: String(thread._id),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to load pay session" },
      { status: 500 }
    );
  }
}
