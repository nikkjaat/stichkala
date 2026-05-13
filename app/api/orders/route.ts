import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import ChatThread from "@/models/ChatThread";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import {
  sendAdminNewOrderAlert,
  sendOrderConfirmation,
} from "@/lib/notifications";
import { CHECKOUT_PROOF_WINDOW_MS } from "@/lib/checkoutDraft";
import {
  appendOrderReceivedAdminChat,
  appendOrderReceivedAdminChatForClient,
} from "@/lib/postOrderAdminChat";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find()
      .populate("items.productId")
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const {
      checkoutDraftStartedAt,
      upiUtr,
      paymentScreenshot,
      upiPaymentFailureReport,
      failureNote,
      chatPayToken: rawChatPayToken,
      chatThreadId: rawChatThreadId,
      chatClientId: rawChatClientId,
      ...orderPayload
    } = body;

    const chatPayToken = String(rawChatPayToken ?? "").trim();
    const chatThreadId = String(rawChatThreadId ?? "").trim();
    const chatClientId = String(rawChatClientId ?? "").trim();

    const isFailureReport =
      orderPayload.paymentMethod === "upi" &&
      typeof checkoutDraftStartedAt === "number" &&
      upiPaymentFailureReport === true;

    const hasUpiProof =
      orderPayload.paymentMethod === "upi" &&
      typeof checkoutDraftStartedAt === "number" &&
      !isFailureReport;

    const isChatNegotiatedUpi =
      hasUpiProof &&
      Boolean(chatPayToken) &&
      mongoose.Types.ObjectId.isValid(chatThreadId) &&
      Boolean(chatClientId);

    if (isFailureReport) {
      if (Date.now() - checkoutDraftStartedAt > CHECKOUT_PROOF_WINDOW_MS) {
        return NextResponse.json(
          { success: false, error: "payment_verification_expired" },
          { status: 400 }
        );
      }
      const shot = String(paymentScreenshot ?? "").trim();
      if (!shot) {
        return NextResponse.json(
          { success: false, error: "failure_screenshot_required" },
          { status: 400 }
        );
      }
      const note = String(failureNote ?? "").trim();
      orderPayload.paymentStatus = "failed";
      orderPayload.paymentDetails = {
        ...orderPayload.paymentDetails,
        payment_screenshot: shot,
      };
      orderPayload.notes = note
        ? `UPI payment failure reported by customer. ${note}`
        : "UPI payment failure reported by customer (see payment screenshot).";
    } else if (hasUpiProof) {
      if (Date.now() - checkoutDraftStartedAt > CHECKOUT_PROOF_WINDOW_MS) {
        return NextResponse.json(
          { success: false, error: "payment_verification_expired" },
          { status: 400 }
        );
      }
      const utr = String(upiUtr ?? "").trim();
      const shot = String(paymentScreenshot ?? "").trim();
      if (!utr && !shot) {
        return NextResponse.json(
          { success: false, error: "utr_or_screenshot_required" },
          { status: 400 }
        );
      }
      orderPayload.paymentDetails = {
        ...orderPayload.paymentDetails,
        ...(utr ? { upi_transaction_id: utr } : {}),
        ...(shot ? { payment_screenshot: shot } : {}),
      };
    }

    // Calculate total amount
    let totalAmount = 0;
    let threadForChat: Awaited<ReturnType<typeof ChatThread.findById>> = null;

    if (isChatNegotiatedUpi) {
      threadForChat = await ChatThread.findById(chatThreadId);
      if (!threadForChat || threadForChat.clientId !== chatClientId) {
        return NextResponse.json(
          { success: false, error: "invalid_chat_checkout" },
          { status: 400 }
        );
      }
      if (
        threadForChat.payOfferToken !== chatPayToken ||
        threadForChat.payOfferUsedAt
      ) {
        return NextResponse.json(
          { success: false, error: "chat_offer_invalid_or_used" },
          { status: 410 }
        );
      }
      if (
        threadForChat.payOfferExpiresAt &&
        new Date(threadForChat.payOfferExpiresAt).getTime() < Date.now()
      ) {
        return NextResponse.json(
          { success: false, error: "chat_offer_expired" },
          { status: 410 }
        );
      }
      const items = orderPayload.items as Array<{
        productId: string;
        quantity: number;
        productName?: string;
        price?: number;
        originalListPrice?: number;
        customization?: unknown;
      }>;
      if (!items?.length) {
        return NextResponse.json(
          { success: false, error: "Items required" },
          { status: 400 }
        );
      }
      const first = items[0];
      if (
        String(threadForChat.payOfferProductId) !== String(first.productId)
      ) {
        return NextResponse.json(
          { success: false, error: "chat_product_mismatch" },
          { status: 400 }
        );
      }
      const product = await Product.findById(first.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: "Product not found" },
          { status: 400 }
        );
      }
      const revised = threadForChat.payOfferAmountRupees as number;
      const list =
        typeof threadForChat.payOfferListPriceRupees === "number"
          ? threadForChat.payOfferListPriceRupees
          : Math.round(Number(product.basePrice) * 100) / 100;
      const qty = Math.max(1, Math.floor(Number(first.quantity) || 1));
      first.quantity = qty;
      first.productName = product.name;
      first.price = revised;
      first.originalListPrice = list;
      totalAmount = Number(orderPayload.totalAmount);
      const baseLine = Math.round(revised * qty * 100) / 100;
      const extra = Math.round((totalAmount - baseLine) * 100) / 100;
      if (extra !== 0 && extra !== 50) {
        return NextResponse.json(
          { success: false, error: "invalid_chat_total" },
          { status: 400 }
        );
      }
      if (!Number.isFinite(totalAmount) || totalAmount < 1) {
        return NextResponse.json(
          { success: false, error: "Invalid total" },
          { status: 400 }
        );
      }
      const prevNotes = orderPayload.notes
        ? String(orderPayload.notes)
        : "";
      orderPayload.notes = [
        prevNotes,
        `UPI — chat agreed price (list ₹${list}, unit ₹${revised}, qty ${qty}).`,
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      for (const item of orderPayload.items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return NextResponse.json(
            { success: false, error: `Product not found: ${item.productId}` },
            { status: 400 }
          );
        }
        item.price = product.basePrice * item.quantity;
        item.productName = product.name;
        totalAmount += item.price;
      }

      // Use provided total amount if available (includes gift wrap and delivery charges)
      if (orderPayload.totalAmount) {
        totalAmount = orderPayload.totalAmount;
      } else {
        if (totalAmount < 500) {
          totalAmount += 50;
        }
      }
    }

    const order = new Order({
      ...orderPayload,
      visitorChatClientId: chatClientId || undefined,
      totalAmount,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    await order.save();
    await order.populate("items.productId");

    if (isChatNegotiatedUpi && threadForChat) {
      threadForChat.set("payOfferUsedAt", new Date());
      await threadForChat.save();
      try {
        await appendOrderReceivedAdminChat(
          threadForChat._id,
          order.orderNumber,
          "agreed"
        );
      } catch (e) {
        console.error("Chat post-order message failed:", e);
      }
    } else if (hasUpiProof && chatClientId && !isChatNegotiatedUpi) {
      try {
        await appendOrderReceivedAdminChatForClient(
          chatClientId,
          order.orderNumber,
          "standard"
        );
      } catch (e) {
        console.error("Chat post-order message failed:", e);
      }
    }

    if (hasUpiProof) {
      try {
        await sendOrderConfirmation(order, "pending");
        await sendAdminNewOrderAlert(order);
      } catch (e) {
        console.error("Order notification failed:", e);
      }
    } else if (isFailureReport) {
      try {
        await sendAdminNewOrderAlert(order);
      } catch (e) {
        console.error("Failure report admin notification failed:", e);
      }
    }

    let razorpayOrderId = null;

    // Create Razorpay order if payment method is online
    if (orderPayload.paymentMethod === "online") {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: totalAmount * 100, // Amount in paise
          currency: "INR",
          receipt: order.orderNumber,
        });
        razorpayOrderId = razorpayOrder.id;
      } catch (error) {
        console.error("Razorpay order creation failed:", error);
        return NextResponse.json(
          { success: false, error: "Payment gateway error" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        order,
        razorpayOrderId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}
