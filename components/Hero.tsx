"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Hero() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Home - Handcrafted Gifts";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        "Discover unique, handcrafted gifts made with love and care. Perfect for every occasion!"
      );
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blush via-lavender to-beige px-4 sm:pt-2"
      style={{
        paddingTop: "3rem", // 80px for navbar height + safe area
        marginTop: "", // Compensate for the padding
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMCAyYy0yLjIxIDAtNCAxLjc5LTQgNHMxLjc5IDQgNCA0IDQtMS43OSA0LTQtMS43OS00LTQtNHoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-30"></div>

      <div className="container mx-auto text-center relative z-10 w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="pt-8 sm:pt-12 md:pt-16" // Additional top padding for content
        >
          <motion.h1
            className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-text-dark mb-4 sm:mb-6 md:mb-8 leading-tight px-2 sm:px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Handcrafted
            <br />
            <span className="text-rose">with Love</span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-text-light max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10 font-light px-4 sm:px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Made with Love, Just for You 💌
            <br />
            Personalised embroidery hoops, hand-painted hankies & charming
            accessories — crafted to tell your story.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-6 max-w-md sm:max-w-none mx-auto"
          >
            <button
              onClick={() => {
                router.push("/products");
              }}
              className="w-full sm:w-auto bg-rose text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl font-medium text-sm sm:text-base border-2 border-rose hover:border-rose-dark"
            >
              Shop Now
            </button>
            <button
              onClick={() => {
                router.push("/products");
              }}
              className="w-full sm:w-auto bg-white text-text-dark px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-opacity-90 transition-all shadow-lg hover:shadow-xl font-medium text-sm sm:text-base border-2 border-white hover:border-gray-200"
            >
              Customize Yours
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-12 sm:mt-16 md:mt-20 lg:mt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-8 md:gap-12 lg:gap-16">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-serif text-rose">
                1000+
              </p>
              <p className="text-xs sm:text-sm md:text-base text-text-light mt-1 sm:mt-2">
                Happy Customers
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-serif text-rose">
                100+
              </p>
              <p className="text-xs sm:text-sm md:text-base text-text-light mt-1 sm:mt-2">
                Unique Designs
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-serif text-rose">
                100%
              </p>
              <p className="text-xs sm:text-sm md:text-base text-text-light mt-1 sm:mt-2">
                Handmade
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 sm:bottom-8 md:bottom-10 left-1/2 transform -translate-x-1/2">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-text-light"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
