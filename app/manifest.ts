import type { MetadataRoute } from "next";

/** PWA manifest — install / home-screen icons from /public. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StichKala - Personalised Embroidery & More",
    short_name: "StichKala",
    description:
      "Handmade gifts, personalised embroidery hoops, and accessories.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfbf9",
    theme_color: "#fff5f7",
    icons: [
      {
        src: "/logo-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
