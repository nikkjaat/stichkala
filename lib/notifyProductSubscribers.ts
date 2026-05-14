import nodemailer from "nodemailer";
import connectDB from "@/lib/mongodb";
import ProductSubscriber from "@/models/ProductSubscriber";
import { getPublicSiteOrigin } from "@/lib/siteUrl";
import { configureWebPushIfPossible, webpush } from "@/lib/webPushServer";

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ProductPayload = {
  _id: string;
  name: string;
  category?: string;
  images?: string[];
  description?: string;
  basePrice?: number;
};

/**
 * Email each active subscriber (personal unsubscribe link) and send Web Push where stored.
 * Runs best-effort; errors are logged, not thrown to callers.
 */
export async function notifySubscribersNewProduct(
  product: ProductPayload
): Promise<void> {
  try {
    await connectDB();
    const subs = (await ProductSubscriber.find({
      active: true,
    }).lean()) as unknown as Array<{
      _id: unknown;
      email: string;
      unsubscribeToken: string;
      pushSubscription?: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    }>;
    if (!subs.length) return;

    const origin = getPublicSiteOrigin();
    const shopUrl = `${origin}/products`;
    const productUrl = `${origin}/products?product=${encodeURIComponent(product._id)}`;
    const safeName = escapeHtml(product.name);
    const catRaw = String(product.category ?? "").trim();
    const safeCategory = catRaw ? escapeHtml(catRaw.replace(/-/g, " ")) : "";
    const firstImg =
      Array.isArray(product.images) && product.images[0]
        ? String(product.images[0])
        : "";
    const descPlain = String(product.description ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const snippet = escapeHtml(descPlain.slice(0, 480));
    const price =
      typeof product.basePrice === "number" &&
      Number.isFinite(product.basePrice)
        ? `₹${product.basePrice}`
        : "";

    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASSWORD?.trim();

    if (emailUser && emailPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: emailUser, pass: emailPass },
      });

      for (const s of subs) {
        const to = String(s.email ?? "").trim();
        if (!to) continue;
        const token = String(s.unsubscribeToken ?? "");
        const unsub = token
          ? `${origin}/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`
          : shopUrl;
        const html = `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto;">
          <h1 style="color:#be123c;font-size:22px;">New piece at StichKalaa</h1>
          <p style="font-size:18px;font-weight:600;color:#1e293b;">${safeName}</p>
          ${
            safeCategory || price
              ? `<p style="font-size:15px;color:#64748b;margin:4px 0 12px;">${
                  safeCategory
                    ? `<span style="text-transform:capitalize;">${safeCategory}</span>`
                    : ""
                }${safeCategory && price ? " · " : ""}${
                  price
                    ? `<strong style="color:#334155;">${escapeHtml(price)}</strong>`
                    : ""
                }</p>`
              : ""
          }
          ${firstImg ? `<p><img src="${escapeHtml(firstImg)}" alt="" width="520" style="max-width:100%;height:auto;border-radius:12px;" /></p>` : ""}
          ${snippet ? `<p style="color:#475569;line-height:1.6;font-size:15px;">${snippet}${descPlain.length > 480 ? "…" : ""}</p>` : ""}
          <p style="margin:20px 0 12px;">
            <a href="${escapeHtml(productUrl)}" style="display:inline-block;background:#e11d48;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;">View this product</a>
          </p>
          <p style="margin:0 0 8px;">
            <a href="${escapeHtml(shopUrl)}" style="color:#64748b;font-size:14px;">Browse all products →</a>
          </p>
          <p style="font-size:12px;color:#94a3b8;margin-top:28px;"><a href="${escapeHtml(unsub)}" style="color:#64748b;">Unsubscribe from new product emails</a></p>
        </div>`;
        try {
          await transporter.sendMail({
            from: emailUser,
            to,
            subject: `New at StichKalaa: ${product.name}`.slice(0, 200),
            html,
          });
        } catch (e) {
          console.error("notifySubscribersNewProduct: mail to", to, e);
        }
      }
    } else {
      console.warn(
        "notifySubscribersNewProduct: EMAIL_USER/PASSWORD missing; skipping email."
      );
    }

    if (!configureWebPushIfPossible()) return;

    const pushBody = [
      product.name,
      price || undefined,
      catRaw ? catRaw.replace(/-/g, " ") : undefined,
    ]
      .filter(Boolean)
      .join(" · ");

    const payload = JSON.stringify({
      title: product.name.slice(0, 80),
      body: pushBody || product.name,
      url: productUrl,
    });

    for (const s of subs) {
      const sub = s.pushSubscription;
      if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload,
          { TTL: 60 * 60 }
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await ProductSubscriber.updateOne(
            { _id: s._id },
            { $unset: { pushSubscription: 1 } }
          ).catch(() => undefined);
        }
        console.error("Web push failed for subscriber", s._id, err);
      }
    }
  } catch (e) {
    console.error("notifySubscribersNewProduct:", e);
  }
}
