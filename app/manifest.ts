import type { MetadataRoute } from "next";

/** PWA manifest — uses SVGs already in /public so paths always resolve. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StichKala - Personalised Embroidery & More",
    short_name: "StichKala",
    description:
      "Handmade gifts, personalised embroidery hoops, and accessories.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e11d48",
    icons: [
      {
        src: "/next.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/vercel.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
