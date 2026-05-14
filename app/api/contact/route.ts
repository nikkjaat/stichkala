import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import connectDB from "@/lib/mongodb";
import ContactFormSubmission from "@/models/ContactFormSubmission";

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    const nameStr = String(name).trim().slice(0, 200);
    const emailStr = String(email).trim().slice(0, 320);
    const subjectStr = String(subject ?? "").trim().slice(0, 400);
    const messageStr = String(message).trim().slice(0, 20000);

    await connectDB();
    await ContactFormSubmission.create({
      name: nameStr,
      email: emailStr,
      subject: subjectStr,
      message: messageStr,
    });

    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASSWORD?.trim();

    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: emailUser, pass: emailPass },
      });

      const safeName = escapeHtml(nameStr);
      const safeEmail = escapeHtml(emailStr);
      const safeSubject = escapeHtml(subjectStr || "Not specified");
      const safeMessageHtml = escapeHtml(messageStr).replace(/\n/g, "<br>");

      try {
        await transporter.sendMail({
          from: emailUser,
          to: emailUser,
          subject: `New Contact Form: ${subjectStr ? subjectStr.slice(0, 160) : "No Subject"}`,
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e11d48;">New Contact Form Submission</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Subject:</strong> ${safeSubject}</p>
            <p><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #e11d48;">
              ${safeMessageHtml}
            </div>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            This email was sent from your website contact form.
          </p>
        </div>
      `,
        });
      } catch (e) {
        console.error("Contact form: owner email failed", e);
      }

      try {
        await transporter.sendMail({
          from: emailUser,
          to: emailStr,
          subject: "Thank you for contacting us!",
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e11d48;">Thank You for Reaching Out!</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <p>Dear ${safeName},</p>
            <p>Thank you for contacting us! We have received your message and will get back to you within 24-48 hours.</p>
            <p><strong>Your Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #e11d48;">
              ${safeMessageHtml}
            </div>
            <p style="margin-top: 20px;">
              Best regards,<br>
              StichKala
            </p>
          </div>
        </div>
      `,
        });
      } catch (e) {
        console.error("Contact form: visitor confirmation email failed", e);
      }
    } else {
      console.warn(
        "Contact form: EMAIL_USER / EMAIL_PASSWORD not set; submission saved without email."
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been received! We will get back to you soon.",
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send message. Please try again later.",
      },
      { status: 500 }
    );
  }
}
