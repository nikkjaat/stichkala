import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { sendOrderConfirmation } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { orderId, upi_transaction_id, payment_screenshot } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId).populate("items.productId");

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    order.paymentDetails = {
      upi_transaction_id: upi_transaction_id || "Manual UPI Payment",
      payment_screenshot: payment_screenshot || "",
    };

    order.paymentStatus = "paid";
    order.status = "confirmed";

    await order.save();

    try {
      await sendOrderConfirmation(order, "confirmed");
    } catch (notificationError) {
      console.error("Failed to send order confirmation:", notificationError);
    }

    return NextResponse.json({
      success: true,
      order,
      message: "Payment confirmed successfully",
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { success: false, error: "Payment confirmation failed" },
      { status: 500 }
    );
  }
}
