import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import Product from "@/models/Product";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import { serializeChatMessage } from "@/lib/chatMessageSerialize";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

function makeToken() {
  return crypto.randomBytes(18).toString("hex");
}

/** POST — admin creates temporary negotiated Razorpay checkout + payment bubble */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    const body = await request.json();
    const amountRupees = Number(body.amountRupees);
    const productId = String(body.productId ?? "").trim();
    const expiresInMinutes = Math.min(
      24 * 60,
      Math.max(15, Number(body.expiresInMinutes ?? 120))
    );

    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amountRupees) || amountRupees < 1 || amountRupees > 500000) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { success: false, error: "Valid productId required" },
        { status: 400 }
      );
    }

    await connectDB();
    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return NextResponse.json(
        { success: false, error: "Thread not found" },
        { status: 404 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 400 }
      );
    }

    const listPriceRupees =
      Math.round(Number(product.basePrice) * 100) / 100;
    const revisedRounded =
      Math.round(amountRupees * 100) / 100;
    const productName = String(product.name ?? "Product");

    const token = makeToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    let rzpOrderId: string;
    try {
      const rzp = await razorpay.orders.create({
        amount: Math.round(revisedRounded * 100),
        currency: "INR",
        receipt: `chat_${threadId.slice(-8)}_${Date.now()}`,
        notes: {
          chatThreadId: String(thread._id),
          chatPayToken: token,
        },
      });
      rzpOrderId = rzp.id;
    } catch (err) {
      console.error(err);
      return NextResponse.json(
        { success: false, error: "Could not create payment session" },
        { status: 500 }
      );
    }

    thread.payOfferToken = token;
    thread.payOfferRazorpayOrderId = rzpOrderId;
    thread.payOfferAmountRupees = revisedRounded;
    thread.payOfferListPriceRupees = listPriceRupees;
    thread.payOfferExpiresAt = expiresAt;
    thread.payOfferProductId = new mongoose.Types.ObjectId(productId);
    thread.payOfferUsedAt = undefined;
    thread.lastMessageAt = new Date();
    await thread.save();

    const label = `Revise price — ${productName}: list ₹${listPriceRupees} → pay ₹${revisedRounded}. Expires ${expiresAt.toLocaleString("en-IN")}.`;
    const msg = await ChatMessage.create({
      threadId: thread._id,
      sender: "admin",
      kind: "payment_cta",
      body: label,
      payToken: token,
      offerProductName: productName,
      offerListPriceRupees: listPriceRupees,
      offerRevisedPriceRupees: revisedRounded,
      offerProductId: new mongoose.Types.ObjectId(productId),
    });

    return NextResponse.json({
      success: true,
      payToken: token,
      razorpayOrderId: rzpOrderId,
      message: serializeChatMessage(
        msg.toObject() as unknown as Parameters<typeof serializeChatMessage>[0]
      ),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to create offer" },
      { status: 500 }
    );
  }
}
