import "./globals.css";
import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import FloatingButtons from "@/components/FloatingButtons";
import BrowserNotifyBanner from "@/components/BrowserNotifyBanner";
import { CustomerChatProvider } from "@/components/CustomerChat";
import NotificationNavBridge from "@/components/NotificationNavBridge";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StichKala - Personalised Embroidery & More",
  description:
    "Beautiful handmade gifts including personalised embroidery hoops, hand-painted hankies, and cute hair accessories. Each piece crafted with love.",
  icons: {
    icon: [
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/logo-192.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${poppins.variable} ${playfair.variable} font-sans`}>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
          async
        />
        <CustomerChatProvider>
          <NotificationNavBridge />
          <Navbar />
          {children}
          <BrowserNotifyBanner />
          <FloatingButtons />
        </CustomerChatProvider>
      </body>
    </html>
  );
}
