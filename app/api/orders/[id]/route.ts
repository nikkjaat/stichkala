import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import {
  sendOrderStatusUpdate,
  sendPaymentConfirmedEmail,
  sendPaymentNotVerifiedEmail,
} from "@/lib/notifications";
import {
  adminChatOrderFieldsUpdated,
  adminChatPaymentConfirmed,
  adminChatPaymentRejected,
} from "@/lib/orderChatMessages";
import { appendAdminTrackOrderChatForVisitor } from "@/lib/postOrderAdminChat";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const order = await Order.findById(params.id).populate("items.productId");

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();

    /** Admin UPI review — emails customer with order number + track link. */
    if (
      body.paymentReviewAction === "confirm" ||
      body.paymentReviewAction === "not_received"
    ) {
      const order = await Order.findById(params.id);
      if (!order) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      if (order.paymentMethod !== "upi") {
        return NextResponse.json(
          { success: false, error: "not_upi_order" },
          { status: 400 }
        );
      }

      if (body.paymentReviewAction === "confirm") {
        let confirmedNow = false;
        if (order.paymentStatus !== "paid") {
          order.paymentStatus = "paid";
          if (order.status === "pending" || order.status === "cancelled") {
            order.status = "confirmed";
          }
          await order.save();
          confirmedNow = true;
          try {
            await sendPaymentConfirmedEmail(order);
          } catch (notificationError) {
            console.error("sendPaymentConfirmedEmail failed:", notificationError);
          }
        }
        if (confirmedNow) {
          const cid = String(order.visitorChatClientId ?? "").trim();
          if (cid) {
            try {
              await appendAdminTrackOrderChatForVisitor(
                cid,
                adminChatPaymentConfirmed(order.orderNumber),
                order.orderNumber
              );
            } catch (e) {
              console.error("Chat payment-confirmed notify failed:", e);
            }
          }
        }
      } else {
        let shouldNotify = false;
        if (order.paymentStatus === "pending") {
          order.paymentStatus = "failed";
          const noteLine =
            "[Admin] Payment not verified / not received as submitted.";
          order.notes = order.notes
            ? `${order.notes}\n${noteLine}`
            : noteLine;
          if (order.status === "pending") {
            order.status = "cancelled";
          }
          await order.save();
          shouldNotify = true;
        } else if (
          order.paymentStatus === "failed" &&
          order.status === "pending"
        ) {
          const noteLine =
            "[Admin] Reviewed UPI failure report (customer notified).";
          order.notes = order.notes
            ? `${order.notes}\n${noteLine}`
            : noteLine;
          order.status = "cancelled";
          await order.save();
          shouldNotify = true;
        }

        if (shouldNotify) {
          const fresh = await Order.findById(params.id);
          if (fresh) {
            try {
              await sendPaymentNotVerifiedEmail(fresh);
            } catch (notificationError) {
              console.error(
                "sendPaymentNotVerifiedEmail failed:",
                notificationError
              );
            }
            const cid = String(fresh.visitorChatClientId ?? "").trim();
            if (cid) {
              try {
                await appendAdminTrackOrderChatForVisitor(
                  cid,
                  adminChatPaymentRejected(fresh.orderNumber),
                  fresh.orderNumber
                );
              } catch (e) {
                console.error("Chat payment-rejected notify failed:", e);
              }
            }
          }
        }
      }

      const updated = await Order.findById(params.id).populate("items.productId");
      return NextResponse.json({ success: true, order: updated });
    }

    const currentOrder = await Order.findById(params.id);
    if (!currentOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const prevStatus = currentOrder.status;
    const prevPaymentStatus = currentOrder.paymentStatus;
    const prevTracking = String(currentOrder.trackingNumber ?? "").trim();

    const isStatusChange =
      body.status && body.status !== currentOrder.status;

    const order = await Order.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    }).populate("items.productId");

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const cid = String(order.visitorChatClientId ?? "").trim();
    if (cid) {
      const trackNow = String(order.trackingNumber ?? "").trim();
      const parts: {
        orderNumber: string;
        status?: string;
        paymentStatus?: string;
        trackingNumber?: string;
      } = { orderNumber: order.orderNumber };
      let changed = false;
      if (order.status !== prevStatus) {
        parts.status = order.status;
        changed = true;
      }
      if (order.paymentStatus !== prevPaymentStatus) {
        parts.paymentStatus = order.paymentStatus;
        changed = true;
      }
      if (trackNow !== prevTracking) {
        parts.trackingNumber = trackNow;
        changed = true;
      }
      if (changed) {
        try {
          await appendAdminTrackOrderChatForVisitor(
            cid,
            adminChatOrderFieldsUpdated(parts),
            order.orderNumber
          );
        } catch (e) {
          console.error("Chat order-update notify failed:", e);
        }
      }
    }

    if (isStatusChange) {
      try {
        await sendOrderStatusUpdate(order, body.status);
      } catch (notificationError) {
        console.error(
          "Failed to send status update notifications:",
          notificationError
        );
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}
