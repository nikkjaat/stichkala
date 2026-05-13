import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import Order from "@/models/Order";
import Product from "@/models/Product";
import {
  sendAdminNewOrderAlert,
  sendOrderConfirmation,
} from "@/lib/notifications";
import { verifyRazorpaySignature } from "@/lib/razorpayVerify";
import { appendOrderReceivedAdminChat } from "@/lib/postOrderAdminChat";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const razorpay_payment_id = String(body.razorpay_payment_id ?? "").trim();
    const razorpay_order_id = String(body.razorpay_order_id ?? "").trim();
    const razorpay_signature = String(body.razorpay_signature ?? "").trim();
    const customerInfo = body.customerInfo;

    if (
      !token ||
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        { success: false, error: "Missing payment fields" },
        { status: 400 }
      );
    }

    const name = String(customerInfo?.name ?? "").trim();
    const phone = String(customerInfo?.phone ?? "").trim();
    const email = String(customerInfo?.email ?? "").trim();
    const street = String(customerInfo?.address?.street ?? "").trim();
    const city = String(customerInfo?.address?.city ?? "").trim();
    const state = String(customerInfo?.address?.state ?? "").trim();
    const pincode = String(customerInfo?.address?.pincode ?? "").trim();

    if (!name || !phone || !street || !city || !state || !pincode) {
      return NextResponse.json(
        {
          success: false,
          error: "Please fill name, phone, and full address to complete payment.",
        },
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
      return NextResponse.json(
        { success: false, error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    await connectDB();
    const thread = await ChatThread.findOne({ payOfferToken: token });
    if (!thread?.payOfferRazorpayOrderId) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }
    if (thread.payOfferRazorpayOrderId !== razorpay_order_id) {
      return NextResponse.json(
        { success: false, error: "Payment does not match this offer" },
        { status: 400 }
      );
    }
    if (thread.payOfferUsedAt) {
      return NextResponse.json(
        { success: false, error: "This link was already used" },
        { status: 410 }
      );
    }
    if (
      thread.payOfferExpiresAt &&
      new Date(thread.payOfferExpiresAt).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { success: false, error: "Offer expired" },
        { status: 410 }
      );
    }

    const productId = thread.payOfferProductId;
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Invalid offer product" },
        { status: 400 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product missing" },
        { status: 400 }
      );
    }

    const amount = thread.payOfferAmountRupees!;
    const listPrice =
      typeof thread.payOfferListPriceRupees === "number"
        ? thread.payOfferListPriceRupees
        : Math.round(Number(product.basePrice) * 100) / 100;
    const order = new Order({
      customerInfo: {
        name,
        email,
        phone,
        whatsappNumber: phone,
        address: {
          street,
          city,
          state,
          pincode,
          country: "India",
        },
      },
      items: [
        {
          productId,
          productName: product.name,
          quantity: 1,
          price: amount,
          originalListPrice: listPrice,
          customization: {
            text: "Negotiated via chat",
            specialInstructions: `Chat thread ${String(thread._id)}. List ₹${listPrice}, paid ₹${amount}.`,
          },
        },
      ],
      totalAmount: amount,
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "online",
      paymentDetails: {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      },
      notes: `Paid via chat — ${product.name}: list ₹${listPrice}, revised ₹${amount} (offer token ${token.slice(0, 8)}…).`,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      visitorChatClientId: thread.clientId,
    });

    await order.save();
    await order.populate("items.productId");

    try {
      await appendOrderReceivedAdminChat(
        thread._id,
        order.orderNumber,
        "agreed"
      );
    } catch (e) {
      console.error("Chat post-order message failed:", e);
    }

    thread.payOfferUsedAt = new Date();
    thread.lastMessageAt = new Date();
    await thread.save();

    try {
      await sendOrderConfirmation(order, "confirmed");
      await sendAdminNewOrderAlert(order);
    } catch (e) {
      console.error("Order notification failed:", e);
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: String(order._id),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Could not complete payment" },
      { status: 500 }
    );
  }
}
