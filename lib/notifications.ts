import nodemailer from "nodemailer";

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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

  // Email HTML
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #FFE4E1 0%, #E6E6FA 100%); padding: 30px; text-align: center;">
        <h1 style="color: #4A4A4A; margin: 0;">Order Confirmed! 🎉</h1>
      </div>
      
      <div style="padding: 30px; background: white;">
        <p>Hi ${customerName},</p>
        
        <p>Thank you for your order! We're excited to create something special for you.</p>
        
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
              .map(
                (item: any) => `
              <li>${item.productName} - Quantity: ${item.quantity}
                ${
                  item.customization?.text
                    ? `<br><small>Customization: ${item.customization.text}</small>`
                    : ""
                }
              </li>
            `
              )
              .join("")}
          </ul>
        </div>
        
        <p>We'll send you updates about your order status by email. You can also message us on Instagram if you have questions.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/track" 
             style="background: #FFB6C1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;">
            Track Your Order
          </a>
        </div>
        
        <p>If you have any questions, feel free to reach out to us!</p>
        
        <p>With love,<br>Handcrafted Gifts Team 💝</p>
      </div>
    </div>
  `;

  await sendEmail(email, `Order Confirmed - ${orderNumber}`, emailHtml);
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
          <a href="https://stichkala.vercel.app/track" 
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
    .map(
      (item: any) =>
        `<li>${item.productName} × ${item.quantity}$${
          item.customization?.text
            ? ` <small>(Custom: ${item.customization.text})</small>`
            : ""
        }</li>`
    )
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
        <p><strong>Status:</strong> ${order.status}</p>
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
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || ""}/secure/admin/vishakha" style="background:#FFB6C1;color:#fff;padding:10px 20px;border-radius:24px;text-decoration:none;display:inline-block;">Open Admin</a>
        </div>
      </div>
    </div>
  `;

  const to = process.env.EMAIL_USER as string;
  if (!to) return;
  await sendEmail(to, subject, html);
};
