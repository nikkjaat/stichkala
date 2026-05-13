"use client";

import { motion } from "framer-motion";
import { FaInstagram } from "react-icons/fa";
import { getInstagramDmUrl } from "@/lib/siteContact";

export default function WhatsAppButton() {
  const handleClick = async () => {
    const message =
      "Hi! I'm interested in your handcrafted gifts. Can you help me with a custom order?";
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      /* ignore */
    }
    window.open(getInstagramDmUrl(), "_blank", "noopener,noreferrer");
  };

  return (
    <motion.button
      onClick={() => void handleClick()}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white p-3 sm:p-4 rounded-full shadow-lg hover:opacity-95 transition-opacity"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      aria-label="Message us on Instagram"
    >
      <FaInstagram className="text-2xl sm:text-3xl" />
    </motion.button>
  );
}
