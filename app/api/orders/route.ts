import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Razorpay from "razorpay";

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

    // Calculate total amount
    let totalAmount = 0;
    for (const item of body.items) {
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
    if (body.totalAmount) {
      totalAmount = body.totalAmount;
    } else {
      // Add delivery charges if needed
      if (totalAmount < 500) {
        totalAmount += 50; // Delivery charges for orders below ₹500
      }
    }

    // REMOVED THE DUPLICATE DELIVERY CHARGES - THIS WAS CAUSING EXTRA ₹50
    // if (totalAmount < 500) {
    //   totalAmount += 50; // Delivery charges for orders below ₹500
    // }

    const order = new Order({
      ...body,
      totalAmount,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });

    await order.save();
    await order.populate("items.productId");

    let razorpayOrderId = null;

    // Create Razorpay order if payment method is online
    if (body.paymentMethod === "online") {
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
