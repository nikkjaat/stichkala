"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  FaWhatsapp,
  FaInstagram,
  FaYoutube,
  FaPlus,
  FaTimes,
  FaEnvelope,
} from "react-icons/fa";

export default function FloatingButtons() {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const floatingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Close when clicking outside - improved for mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        floatingRef.current &&
        !floatingRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Add both mouse and touch events for better mobile support
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchend", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchend", handleClickOutside);
    };
  }, []);

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      "Hi! I'm interested in your handcrafted gifts. Can you help me with a custom order?"
    );
    window.open(`https://wa.me/+919760258097?text=${message}`, "_blank");
    // Don't close immediately on mobile - let user see the action
    setTimeout(() => setIsOpen(false), 1000);
  };

  const handleInstagramClick = () => {
    window.open("https://www.instagram.com/vishakha_baliyan26", "_blank");
    setTimeout(() => setIsOpen(false), 1000);
  };

  const handleYoutubeClick = () => {
    window.open(
      "https://youtube.com/@choudharyvi?si=ZlRQkWqhotZb_0LO",
      "_blank"
    );
    setTimeout(() => setIsOpen(false), 1000);
  };

  const handleEmailClick = () => {
    const subject = encodeURIComponent("Inquiry about Handcrafted Gifts");
    const body = encodeURIComponent(
      "Hi Vishakha,\n\nI'm interested in your handcrafted gifts. Could you please provide more information about:\n\n- Custom order options\n- Pricing and delivery time\n- Available designs\n\nThank you!"
    );
    window.open(
      `mailto:vishakha.baliyan26@gmail.com?subject=${subject}&body=${body}`,
      "_blank"
    );
    setTimeout(() => setIsOpen(false), 1000);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div ref={floatingRef} className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {/* Social Media Buttons */}
        {isOpen && (
          <motion.div
            className="flex flex-col gap-3 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Instagram */}
            <motion.button
              onClick={handleInstagramClick}
              className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center touch-manipulation"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <FaInstagram className="text-xl" />
            </motion.button>

            {/* YouTube */}
            <motion.button
              onClick={handleYoutubeClick}
              className="w-12 h-12 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all flex items-center justify-center touch-manipulation"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: 20 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <FaYoutube className="text-xl" />
            </motion.button>

            {/* WhatsApp */}
            <motion.button
              onClick={handleWhatsAppClick}
              className="w-12 h-12 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-all flex items-center justify-center touch-manipulation"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: 20 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <FaWhatsapp className="text-xl" />
            </motion.button>

            {/* Email */}
            {/* <motion.button
              onClick={handleEmailClick}
              className="w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-all flex items-center justify-center touch-manipulation"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: 20 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <FaEnvelope className="text-xl" />
            </motion.button> */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={toggleMenu}
        className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transition-all touch-manipulation ${
          isOpen
            ? "bg-rose text-white hover:bg-rose-dark"
            : "bg-white text-rose border border-rose hover:bg-rose hover:text-white"
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? 1 : 0,
          rotate: isOpen ? 90 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {isOpen ? (
          <FaTimes className="text-xl" />
        ) : (
          <FaPlus className="text-xl" />
        )}
      </motion.button>

      {/* Remove the backdrop completely as it was causing issues */}
    </div>
  );
}
