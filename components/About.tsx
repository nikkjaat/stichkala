"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function About() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section
      id="about"
      className={`min-h-screen py-6 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 bg-gradient-to-br from-lavender/80 via-beige/90 to-blush/80 transition-all duration-500 ${
        isMounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-text-dark mb-3 sm:mb-4 leading-tight">
            Made with Heart,
          </h2>
          <div className="relative inline-block">
            <span className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-rose block leading-tight relative z-10">
              Crafted with Care
            </span>
            <div className="absolute bottom-1 left-0 w-full h-3 bg-rose/20 -z-0 rounded-full"></div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-start">
          {/* Text Content - Mobile First Order */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1"
          >
            <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-sm border border-white/50"
              >
                <p className="text-text-light text-base sm:text-lg leading-relaxed sm:leading-loose">
                  Every piece in our collection is thoughtfully handcrafted with
                  love and attention to detail. We believe that the best gifts
                  come from the heart, and each creation reflects that
                  philosophy.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 sm:p-6 shadow-sm border border-white/50"
              >
                <p className="text-text-light text-base sm:text-lg leading-relaxed sm:leading-loose">
                  From personalised embroidery hoops that tell your story, to
                  hand-painted hankies that capture special moments, and
                  adorable hair accessories that add charm to your day—we pour
                  our passion into every stitch, brushstroke, and detail.
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <motion.button
                className="bg-white text-text-dark px-8 py-4 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 font-medium text-base w-full sm:w-auto border-2 border-white hover:border-rose/30 group relative overflow-hidden"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10 group-hover:text-rose transition-colors duration-300">
                  Our Story
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-rose/5 to-lavender/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </motion.button>

              <motion.button
                className="bg-transparent text-text-dark px-8 py-4 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 font-medium text-base w-full sm:w-auto border-2 border-text-dark/20 hover:border-rose/50 group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  router.push("/products");
                }}
              >
                <span className="group-hover:text-rose transition-colors duration-300">
                  View Collection
                </span>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 sm:space-y-8 border border-white/50">
              {/* Feature 1 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex items-start gap-4 sm:gap-5 p-4 rounded-2xl bg-gradient-to-r from-rose/5 to-transparent hover:from-rose/10 transition-all duration-300 group cursor-pointer"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                  <span className="text-xl sm:text-2xl">✨</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg sm:text-xl text-text-dark mb-2 group-hover:text-rose transition-colors duration-300">
                    Personalised Touch
                  </h3>
                  <p className="text-text-light text-sm sm:text-base leading-relaxed">
                    Custom designs tailored to your story and preferences with
                    meticulous attention to detail
                  </p>
                </div>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex items-start gap-4 sm:gap-5 p-4 rounded-2xl bg-gradient-to-r from-lavender/5 to-transparent hover:from-lavender/10 transition-all duration-300 group cursor-pointer"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-lavender rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                  <span className="text-xl sm:text-2xl">🎨</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg sm:text-xl text-text-dark mb-2 group-hover:text-lavender transition-colors duration-300">
                    StichKalaa Quality
                  </h3>
                  <p className="text-text-light text-sm sm:text-base leading-relaxed">
                    Meticulously crafted using premium, sustainable materials
                    that stand the test of time
                  </p>
                </div>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-start gap-4 sm:gap-5 p-4 rounded-2xl bg-gradient-to-r from-beige/5 to-transparent hover:from-beige/10 transition-all duration-300 group cursor-pointer"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-beige rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                  <span className="text-xl sm:text-2xl">💝</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg sm:text-xl text-text-dark mb-2 group-hover:text-beige transition-colors duration-300">
                    Perfect Gifts
                  </h3>
                  <p className="text-text-light text-sm sm:text-base leading-relaxed">
                    Thoughtful, memorable presents for every special occasion
                    and celebration
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Decorative Element */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 text-center"
            >
              <div className="inline-flex items-center gap-2 text-text-light text-sm bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <span className="w-2 h-2 bg-rose rounded-full animate-pulse"></span>
                Handcrafted with love since 2020
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
