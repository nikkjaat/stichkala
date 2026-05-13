import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyRazorpaySignature } from "@/lib/razorpayVerify";
import {
  sendAdminNewOrderAlert,
  sendOrderConfirmation,
} from "@/lib/notifications";
import { appendOrderReceivedAdminChatForClient } from "@/lib/postOrderAdminChat";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const {
      orderId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = body;

    if (
      !orderId ||
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required payment details" },
        { status: 400 }
      );
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: "Server misconfigured" },
        { status: 500 }
      );
    }

    if (
      !verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      )
    ) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "failed",
        status: "cancelled",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed - Invalid signature",
        },
        { status: 400 }
      );
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        paymentStatus: "paid",
        status: "confirmed",
        paymentDetails: {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
        },
      },
      { new: true }
    ).populate("items.productId");

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    try {
      await sendOrderConfirmation(order, "confirmed");
      await sendAdminNewOrderAlert(order);
    } catch (e) {
      console.error("Order notification failed:", e);
    }

    const visitorId = String(
      (order as { visitorChatClientId?: string }).visitorChatClientId ?? ""
    ).trim();
    if (visitorId) {
      try {
        await appendOrderReceivedAdminChatForClient(
          visitorId,
          order.orderNumber,
          "standard"
        );
      } catch (e) {
        console.error("Chat post-payment message failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      order,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { success: false, error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
