import nodemailer from "nodemailer";
import { getPublicSiteOrigin } from "@/lib/siteUrl";

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/** Site origin without trailing slash (for email links). */
export const publicSiteUrlBase = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

/** Public track URL with order number pre-filled for the customer. */
export const trackOrderPublicUrl = (orderNumber: string) => {
  const base = publicSiteUrlBase();
  const query = `order=${encodeURIComponent(orderNumber)}`;
  if (base) return `${base}/track?${query}`;
  return `/track?${query}`;
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    if (!to) return; // Skip if no email provided

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};

export const sendOrderConfirmation = async (order: any, _status: string) => {
  const customerName = order.customerInfo.name;
  const orderNumber = order.orderNumber;
  const totalAmount = order.totalAmount;
  const email = order.customerInfo.email;

  const awaitingUpiVerify =
    order.paymentStatus === "pending" &&
    Boolean(
      order.paymentDetails?.upi_transaction_id ||
        order.paymentDetails?.payment_screenshot
    );

  const heading = awaitingUpiVerify
    ? "We received your order"
    : "Order Confirmed! 🎉";
  const intro = awaitingUpiVerify
    ? "<p>Thank you! We have your UPI details (UTR and/or payment screenshot) and will <strong>verify your payment manually</strong> shortly. Your order number is below — you can track status anytime.</p>"
    : "<p>Thank you for your order! We're excited to create something special for you.</p>";

  // Email HTML
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFE4E1 0%, #E6E6FA 100%); padding: 30px; text-align: center;">
        <h1 style="color: #4A4A4A; margin: 0;">${heading}</h1>
      </div>
      
      <div style="padding: 30px; background: white;">
        <p>Hi ${customerName},</p>
        
        ${intro}
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4A4A4A;">Order Details</h3>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
          <p><strong>Estimated Delivery:</strong> ${new Date(
            order.estimatedDelivery
          ).toLocaleDateString("en-IN")}</p>
          
          <h4>Items:</h4>
          <ul>
            ${order.items
              .map((item: any) => {
                const priceLine =
                  item.originalListPrice != null &&
                  item.originalListPrice !== item.price
                    ? `<br><small>List ₹${item.originalListPrice} → paid ₹${item.price}</small>`
                    : "";
                return `
              <li>${item.productName} - Quantity: ${item.quantity}${priceLine}
                ${
                  item.customization?.text
                    ? `<br><small>Customization: ${item.customization.text}</small>`
                    : ""
                }
              </li>`;
              })
              .join("")}
          </ul>
        </div>
        
        <p>We'll send you updates about your order status by email. You can also message us on Instagram if you have questions.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${trackOrderPublicUrl(orderNumber)}" 
             style="background: #FFB6C1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">
            Track Your Order
          </a>
        </div>
        
        <p>If you have any questions, feel free to reach out to us!</p>
        
        <p>With love,<br>Handcrafted Gifts Team 💝</p>
      </div>
    </div>
  `;

  await sendEmail(
    email,
    awaitingUpiVerify
      ? `Order received (UPI verification) - ${orderNumber}`
      : `Order Confirmed - ${orderNumber}`,
    emailHtml
  );
};

export const sendOrderStatusUpdate = async (order: any, newStatus: string) => {
  const customerName = order.customerInfo.name;
  const orderNumber = order.orderNumber;
  const email = order.customerInfo.email;

  const statusMessages = {
    confirmed: "Your order has been confirmed and we're preparing it! 🎨",
    "in-progress": "Great news! We've started working on your order! 🎨",
    completed: "Your order is ready and will be shipped soon! 📦",
    shipped: "Your order is on its way to you! 🚚",
    delivered: "Your order has been delivered! We hope you love it! 🎉",
    cancelled:
      "Your order has been cancelled. If you have any questions, please contact us.",
  };

  const statusEmojis = {
    confirmed: "✅",
    "in-progress": "🎨",
    completed: "✨",
    shipped: "📦",
    delivered: "🎉",
    cancelled: "❌",
  };

  const message =
    statusMessages[newStatus as keyof typeof statusMessages] ||
    "Your order status has been updated.";
  const emoji = statusEmojis[newStatus as keyof typeof statusEmojis] || "📋";

  // Email HTML
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFE4E1 0%, #E6E6FA 100%); padding: 30px; text-align: center;">
        <h1 style="color: #4A4A4A; margin: 0;">Order Update ${emoji}</h1>
      </div>
      
      <div style="padding: 30px; background: white;">
        <p>Hi ${customerName},</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #4A4A4A;">Order #${orderNumber}</h3>
          <p style="font-size: 18px; color: #FFB6C1; font-weight: bold;">${message}</p>
        </div>
        
        ${
          newStatus === "shipped"
            ? "<p>Your package is on its way! You can expect delivery within 2-3 days.</p>"
            : ""
        }
        ${
          newStatus === "delivered"
            ? "<p>We hope you absolutely love your handcrafted item! If you're happy with your purchase, we'd love to see a photo. 📸</p>"
            : ""
        }
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${trackOrderPublicUrl(orderNumber)}" 
             style="background: #FFB6C1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">
            Track Your Order
          </a>
        </div>
        
        <p>Thank you for choosing Handcrafted Gifts!</p>
        
        <p>With love,<br>Handcrafted Gifts Team 💝</p>
      </div>
    </div>
  `;

  await sendEmail(email, `Order Update - ${orderNumber}`, emailHtml);
};

export const sendAdminNewOrderAlert = async (order: any) => {
  const subject = `New Order Received - ${order.orderNumber}`;
  const itemsHtml = order.items
    .map((item: any) => {
      const priceLine =
        item.originalListPrice != null &&
        item.originalListPrice !== item.price
          ? ` — <small>list ₹${item.originalListPrice}, paid ₹${item.price}</small>`
          : ` — ₹${item.price}`;
      return `<li>${item.productName} × ${item.quantity}${priceLine}${
        item.customization?.text
          ? ` <small>(Custom: ${item.customization.text})</small>`
          : ""
      }</li>`;
    })
    .join("");

  const address = order.customerInfo?.address
    ? `${order.customerInfo.address.street}, ${order.customerInfo.address.city}, ${order.customerInfo.address.state} - ${order.customerInfo.address.pincode}`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFE4E1 0%, #E6E6FA 100%); padding: 24px; text-align: center;">
        <h2 style="color: #4A4A4A; margin: 0;">New Order Received</h2>
      </div>
      <div style="padding: 24px; background: #ffffff;">
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Created At:</strong> ${new Date(order.createdAt).toLocaleString("en-IN")}</p>
        <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Payment status:</strong> ${order.paymentStatus}</p>
        ${
          order.paymentDetails?.upi_transaction_id
            ? `<p><strong>UPI / UTR:</strong> ${order.paymentDetails.upi_transaction_id}</p>`
            : ""
        }
        ${
          order.paymentDetails?.payment_screenshot
            ? `<p><strong>Payment screenshot:</strong> <a href="${order.paymentDetails.payment_screenshot}">Open image</a></p>`
            : ""
        }
        ${
          order.paymentDetails?.razorpay_payment_id
            ? `<p><strong>Razorpay payment id:</strong> ${order.paymentDetails.razorpay_payment_id}</p><p><strong>Razorpay order id:</strong> ${order.paymentDetails.razorpay_order_id || ""}</p>`
            : ""
        }
        <p><strong>Order workflow status:</strong> ${order.status}</p>
        ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ""}
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
        <p><strong>Customer:</strong> ${order.customerInfo?.name || ""}</p>
        <p><strong>Email:</strong> ${order.customerInfo?.email || ""}</p>
        <p><strong>Phone:</strong> ${order.customerInfo?.phone || ""}</p>
        <p><strong>Contact (legacy field):</strong> ${order.customerInfo?.whatsappNumber || ""}</p>
        ${address ? `<p><strong>Address:</strong> ${address}</p>` : ""}
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
        <h3 style="margin: 8px 0; color: #4A4A4A;">Items</h3>
        <ul>${itemsHtml}</ul>
        <div style="text-align:center;margin-top:24px;">
          <a href="${publicSiteUrlBase()}/secure/admin/vishakha" style="background:#FFB6C1;color:#fff;padding:10px 20px;border-radius:24px;text-decoration:none;display:inline-block;">Open Admin</a>
        </div>
      </div>
    </div>
  `;

  const to = process.env.EMAIL_USER as string;
  if (!to) return;
  await sendEmail(to, subject, html);
};

/** After admin marks UPI payment as received — customer can track with one tap. */
export const sendPaymentConfirmedEmail = async (order: any) => {
  const email = String(order.customerInfo?.email ?? "").trim();
  if (!email) return;

  const orderNumber = order.orderNumber;
  const name = order.customerInfo?.name || "there";
  const trackUrl = trackOrderPublicUrl(orderNumber);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFE4E1 0%, #E6E6FA 100%); padding: 28px; text-align: center;">
        <h1 style="color: #4A4A4A; margin: 0;">Payment confirmed</h1>
      </div>
      <div style="padding: 28px; background: #ffffff;">
        <p>Hi ${name},</p>
        <p>We&apos;ve verified your UPI payment. Your order is confirmed.</p>
        <div style="background: #f8f9fa; padding: 18px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Order number:</strong> ${orderNumber}</p>
          <p style="margin: 12px 0 0 0;"><strong>Total:</strong> ₹${order.totalAmount}</p>
        </div>
        <p style="font-size: 14px; color: #555;">Use the link below to track your order — your order number is already filled in. You can also open Track order on the site and type the number manually if you prefer.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${trackUrl}"
             style="background: #FFB6C1; color: white; padding: 12px 28px; text-decoration: none; border-radius: 25px; display: inline-block;">
            Track order
          </a>
        </div>
        <p style="font-size: 13px; color: #888;">Link: <a href="${trackUrl}">${trackUrl}</a></p>
        <p>With love,<br>StichKala</p>
      </div>
    </div>
  `;

  await sendEmail(
    email,
    `Payment confirmed — Order ${orderNumber}`,
    html
  );
};

/** After admin cannot verify payment — explain next steps with same track link. */
export const sendPaymentNotVerifiedEmail = async (order: any) => {
  const email = String(order.customerInfo?.email ?? "").trim();
  if (!email) return;

  const orderNumber = order.orderNumber;
  const name = order.customerInfo?.name || "there";
  const trackUrl = trackOrderPublicUrl(orderNumber);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f3f4f6 0%, #fce7f3 100%); padding: 28px; text-align: center;">
        <h1 style="color: #4A4A4A; margin: 0;">Payment not verified</h1>
      </div>
      <div style="padding: 28px; background: #ffffff;">
        <p>Hi ${name},</p>
        <p>We weren&apos;t able to verify your UPI payment for the order below (wrong UTR, amount mismatch, or no credit received). If you&apos;ve already paid, reply to this email or message us on Instagram with your UPI reference and a fresh screenshot.</p>
        <div style="background: #f8f9fa; padding: 18px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Order reference:</strong> ${orderNumber}</p>
        </div>
        <p style="font-size: 14px; color: #555;">You can still check status anytime — the link opens tracking with your order number filled in.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${trackUrl}"
             style="background: #9ca3af; color: white; padding: 12px 28px; text-decoration: none; border-radius: 25px; display: inline-block;">
            Track order
          </a>
        </div>
        <p style="font-size: 13px; color: #888;">Link: <a href="${trackUrl}">${trackUrl}</a></p>
        <p>StichKala</p>
      </div>
    </div>
  `;

  await sendEmail(
    email,
    `Payment not verified — Order ${orderNumber}`,
    html
  );
};
